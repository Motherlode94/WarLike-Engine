"""Private WarLike LAN relay and static engine server. Python 3.10+, stdlib only.

The host browser owns gameplay; guests can submit inputs, never world snapshots.
No accounts, external relay, telemetry or automatic port forwarding.
"""
import argparse
import hmac
import http.server
import json
import math
import queue
import secrets
import socket
import threading
import time
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
ACTIONS = {'craft:axe', 'craft:pickaxe', 'repair:axe', 'repair:pickaxe', 'revive', 'gather', 'drink', 'eat', 'rest', 'refuel', 'craft:campfire', 'craft:shelter', 'craft:bandage', 'craft:meal'}
KEYS = set('wasdzqexuf123456 ') | {'shift', 'control', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'}


def clean(value, depth=0):
    if depth > 20:
        raise ValueError('Données trop imbriquées.')
    if isinstance(value, dict):
        if len(value) > 1024:
            raise ValueError('Objet trop volumineux.')
        return {str(k): clean(v, depth + 1) for k, v in value.items() if k not in ('__proto__', 'constructor', 'prototype')}
    if isinstance(value, list):
        if len(value) > 4096:
            raise ValueError('Liste trop volumineuse.')
        return [clean(v, depth + 1) for v in value]
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError('Nombre invalide.')
    return value


def survival_actions(value):
    if not isinstance(value, list):
        return []
    actions = []
    for action in value[:4]:
        if isinstance(action, str) and action in ACTIONS:
            if action not in actions:
                actions.append(action)
        elif isinstance(action, dict) and action.get('type') == 'place' and action.get('recipe') in ('campfire', 'shelter'):
            if all(isinstance(action.get(k), (int, float)) and not isinstance(action[k], bool) and math.isfinite(action[k]) and abs(action[k]) <= 1000000 for k in ('x', 'y', 'rotation')):
                actions.append({k: action[k] for k in ('type', 'recipe', 'x', 'y', 'rotation')})
    return actions


class Lobby:
    def __init__(self, owner_key=None, clock=time.monotonic):
        self.owner_key = owner_key or secrets.token_urlsafe(12)
        self.rooms, self.sessions = {}, {}
        self.lock, self.clock = threading.RLock(), clock

    def publish(self, room, event, exclude=None):
        for peer in room['peers'].values():
            if peer['id'] == exclude:
                continue
            for stream in list(peer['streams']):
                if stream.full():
                    try:
                        stream.get_nowait()
                    except queue.Empty:
                        pass
                stream.put_nowait(event)

    def peer(self, room, name, host=False):
        name = str(name or 'Joueur').strip()[:30] or 'Joueur'
        if room.get('snapshot') and any(isinstance(o, dict) and o.get('survival') for o in room['snapshot']['entities']) and any(p['name'] == name for p in room['peers'].values()):
            raise ValueError('Ce nom est déjà utilisé. Choisis un nom distinct pour retrouver ton survivant.')
        identity, token = secrets.token_hex(4), secrets.token_urlsafe(24)
        peer = {'id': identity, 'token': token, 'name': name, 'host': host, 'seen': self.clock(), 'streams': [], 'lastInput': -1, 'lastPost': 0}
        room['peers'][identity] = peer
        self.sessions[token] = (room, peer)
        return peer

    def roster(self, room):
        return [{'id': p['id'], 'name': p['name'], 'host': p['host']} for p in room['peers'].values()]

    def authorize(self, token):
        if token not in self.sessions:
            raise PermissionError('Session inconnue ou expirée.')
        room, peer = self.sessions[token]
        peer['seen'] = self.clock()
        return room, peer

    def prune(self):
        for token, (room, peer) in list(self.sessions.items()):
            if self.clock() - peer['seen'] > 15:
                self.leave(token)

    def leave(self, token):
        pair = self.sessions.pop(token, None)
        if not pair:
            return
        room, peer = pair
        room['peers'].pop(peer['id'], None)
        if peer['host']:
            self.publish(room, {'type': 'closed', 'reason': 'L’hôte a quitté la partie.'})
            for p in room['peers'].values():
                self.sessions.pop(p['token'], None)
            self.rooms.pop(room['code'], None)
        else:
            self.publish(room, {'type': 'roster', 'players': self.roster(room)})

    def request(self, action, data):
        with self.lock:
            self.prune()
            if action == 'create':
                if not hmac.compare_digest(str(data.get('key', '')), self.owner_key):
                    raise PermissionError('Clé d’hébergement incorrecte.')
                if len(self.rooms) >= 4:
                    raise ValueError('Quatre salons maximum.')
                code = ''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(8))
                room = {'code': code, 'peers': {}, 'snapshot': None, 'sequence': 0}
                self.rooms[code] = room
                peer = self.peer(room, data.get('name'), True)
            elif action == 'join':
                room = self.rooms.get(str(data.get('code', '')).upper())
                if not room:
                    raise ValueError('Code de salon inconnu.')
                if len(room['peers']) >= 4:
                    raise ValueError('Le salon est complet (4 joueurs).')
                if room['snapshot'] is None:
                    raise ValueError('Attendre la première scène de l’hôte.')
                peer = self.peer(room, data.get('name'))
                self.publish(room, {'type': 'roster', 'players': self.roster(room)})
            else:
                room, peer = self.authorize(str(data.get('token', '')))
                if action == 'leave':
                    self.leave(peer['token'])
                    return {'ok': True}
                if action == 'ping':
                    return {'ok': True}
                if self.clock() - peer['lastPost'] < .015:
                    raise ValueError('Fréquence de mise à jour trop élevée.')
                peer['lastPost'] = self.clock()
                if action == 'snapshot':
                    if not peer['host']:
                        raise PermissionError('Seul l’hôte peut publier le monde.')
                    snapshot = clean(data.get('snapshot'))
                    if not isinstance(snapshot, dict) or snapshot.get('mode') not in ('2d', '3d') or not isinstance(snapshot.get('entities'), list) or len(snapshot['entities']) > 256:
                        raise ValueError('Scène réseau invalide (256 objets maximum).')
                    room['sequence'] += 1
                    room['snapshot'] = snapshot
                    self.publish(room, {'type': 'snapshot', 'sequence': room['sequence'], 'snapshot': snapshot}, exclude=peer['id'])
                elif action == 'input':
                    seq = data.get('sequence')
                    if peer['host'] or not isinstance(seq, int) or isinstance(seq, bool) or seq <= peer['lastInput']:
                        return {'ok': True}
                    peer['lastInput'] = seq
                    keys = lambda field: list(dict.fromkeys(k for k in data.get(field, [])[:32] if isinstance(k, str) and k in KEYS))
                    yaw = data.get('yaw', 0)
                    yaw = max(-10000, min(10000, yaw)) if isinstance(yaw, (int, float)) and math.isfinite(yaw) else 0
                    self.publish(room, {'type': 'input', 'peerId': peer['id'], 'keys': keys('keys'), 'pressed': keys('pressed'), 'yaw': yaw, 'actions': survival_actions(data.get('actions')), 'sequence': seq}, exclude=peer['id'])
                else:
                    raise ValueError('Commande inconnue.')
                return {'ok': True}
            return {'ok': True, 'code': room['code'], 'peerId': peer['id'], 'token': peer['token'], 'host': peer['host'], 'players': self.roster(room), 'mode': room['snapshot']['mode'] if room['snapshot'] else None}


class LanHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass  # Session tokens in SSE query strings must not enter access logs.

    def json_reply(self, status, data):
        raw = json.dumps(data, ensure_ascii=False, allow_nan=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        if self.close_connection:
            self.send_header('Connection', 'close')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(raw)

    def do_POST(self):
        if not self.path.startswith('/lan/'):
            self.close_connection = True
            return self.json_reply(404, {'error': 'Route inconnue.'})
        # Only the engine served by this LAN server may issue browser mutations.
        origin = self.headers.get('Origin')
        if origin and urlsplit(origin).netloc != self.headers.get('Host'):
            self.close_connection = True
            return self.json_reply(403, {'error': 'Origine refusée.'})
        try:
            size = int(self.headers.get('Content-Length', 0))
            if not 0 < size <= 1048576:
                self.close_connection = True
                raise ValueError('Message vide ou trop volumineux (1 Mo maximum).')
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError('Message invalide.')
            self.json_reply(200, self.server.lobby.request(self.path.removeprefix('/lan/'), data))
        except PermissionError as error:
            self.json_reply(403, {'error': str(error)})
        except (ValueError, TypeError, RecursionError) as error:
            self.json_reply(400, {'error': str(error)})

    def do_GET(self):
        path = urlsplit(self.path)
        if path.path == '/lan/info':
            return self.json_reply(200, {'protocol': 1, 'name': 'WarLike LAN', 'maxPlayers': 4})
        if path.path == '/lan/events':
            token = parse_qs(path.query).get('token', [''])[0]
            try:
                with self.server.lobby.lock:
                    room, peer = self.server.lobby.authorize(token)
                    if len(peer['streams']) >= 2:
                        raise PermissionError('Trop de connexions pour cette session.')
                    stream = queue.Queue(maxsize=64)
                    peer['streams'].append(stream)
                    stream.put({'type': 'roster', 'players': self.server.lobby.roster(room)})
                    if room['snapshot'] and not peer['host']:
                        stream.put({'type': 'snapshot', 'sequence': room['sequence'], 'snapshot': room['snapshot']})
                self.send_response(200)
                self.send_header('Content-Type', 'text/event-stream')
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('X-Accel-Buffering', 'no')
                self.end_headers()
                self.wfile.write(b'retry: 1000\n\n')
                self.wfile.flush()
                while token in self.server.lobby.sessions:
                    try:
                        event = stream.get(timeout=2)
                        raw = ('data: ' + json.dumps(event, ensure_ascii=False, allow_nan=False) + '\n\n').encode()
                    except queue.Empty:
                        raw = b': heartbeat\n\n'
                    self.wfile.write(raw)
                    self.wfile.flush()
            except PermissionError as error:
                return self.json_reply(403, {'error': str(error)})
            except (BrokenPipeError, ConnectionResetError, OSError):
                pass
            finally:
                if 'peer' in locals() and 'stream' in locals() and stream in peer['streams']:
                    peer['streams'].remove(stream)
            return
        if not self.static_allowed(path.path):
            return self.json_reply(403, {'error': 'Fichier non servi.'})
        super().do_GET()

    def static_allowed(self, path):
        decoded = unquote(path)
        allowed = decoded in ('/', '/index.html', '/runtime-files.json', '/python/lan_server.py', '/python/warlike.py', '/start-warlike-multi.cmd') or decoded.startswith(('/js/', '/css/', '/src/', '/assets/', '/vendor/', '/native/dist/', '/examples/community/', '/docs/'))
        resolved = (ROOT / decoded.lstrip('/')).resolve()
        return allowed and not any(part.startswith('.') for part in Path(decoded).parts) and resolved.is_relative_to(ROOT) and not (resolved.is_dir() and decoded != '/')

    def do_HEAD(self):
        if not self.static_allowed(urlsplit(self.path).path):
            return self.json_reply(403, {'error': 'Fichier non servi.'})
        super().do_HEAD()


def serve(host='0.0.0.0', port=8765, key=None):
    lobby = Lobby(key)
    with http.server.ThreadingHTTPServer((host, port), LanHandler) as server:
        server.lobby = lobby
        print(f'WarLike LAN : http://localhost:{server.server_port}/', flush=True)
        try:
            addresses = socket.gethostbyname_ex(socket.gethostname())[2]
        except OSError:
            addresses = []
        for address in sorted(set(addresses)):
            if not address.startswith('127.'):
                print(f'Adresse à ouvrir sur les autres PC : http://{address}:{server.server_port}/', flush=True)
        print(f'Clé d’hébergement : {lobby.owner_key}\nGarder cette fenêtre ouverte. Arrêt : Ctrl+C.', flush=True)
        server.serve_forever()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Serveur privé WarLike sur votre réseau local.')
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--port', default=8765, type=int)
    parser.add_argument('--key')
    args = parser.parse_args()
    try:
        serve(args.host, args.port, args.key)
    except KeyboardInterrupt:
        pass
