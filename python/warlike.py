#!/usr/bin/env python3
"""WarLike developer tools. Python 3.10+, no dependency for these commands."""
import argparse
import http.server
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def validate(data):
    errors = []
    scenes = data.get('scenes') if isinstance(data, dict) else None
    if scenes is None:
        scenes = [data]
    if not isinstance(scenes, list) or not scenes:
        return ['Aucune scène valide.']
    for number, scene in enumerate(scenes, 1):
        entities = scene.get('entities') if isinstance(scene, dict) else None
        if not isinstance(entities, list):
            errors.append(f'Scène {number} : entities doit être une liste.')
            continue
        ids = set()
        for index, actor in enumerate(entities):
            label = f'Scène {number}, objet {index + 1}'
            if not isinstance(actor, dict):
                errors.append(label + ' : objet invalide.')
                continue
            identity = actor.get('id')
            if not isinstance(identity, int) or isinstance(identity, bool) or identity in ids:
                errors.append(label + ' : identifiant entier unique requis.')
            else:
                ids.add(identity)
            for key in ('x', 'y', 'w', 'h'):
                value = actor.get(key)
                if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value) or (key in ('w', 'h') and value <= 0):
                    errors.append(label + f' : {key} invalide.')
    return errors


def run_tool(command):
    if not shutil.which(command[0]):
        raise ValueError(f'Outil requis introuvable : {command[0]}')
    return subprocess.call(command, cwd=ROOT)


def main(argv=None):
    parser = argparse.ArgumentParser(description='Outils Python WarLike : serveur local, validation, inventaire et builds.')
    commands = parser.add_subparsers(dest='command', required=True)
    server = commands.add_parser('serve', help='Servir le moteur sur 127.0.0.1 (8000 par défaut).')
    server.add_argument('--port', type=int, default=8000)
    multi = commands.add_parser('multiplayer', help='Serveur privé LAN (4 joueurs).')
    multi.add_argument('--host', default='0.0.0.0')
    multi.add_argument('--port', type=int, default=8765)
    multi.add_argument('--key')
    check = commands.add_parser('validate', help='Valider une scène ou un projet JSON exporté.')
    check.add_argument('file', type=Path)
    commands.add_parser('assets', help='Compter les modèles et vérifier leurs fichiers locaux.')
    commands.add_parser('manifest', help='Reconstruire le manifeste des exports Web.')
    commands.add_parser('build-native', help='Compiler C++ en WASM (Emscripten requis).')
    commands.add_parser('csharp', help='Lancer le bridge .NET 8 local (SDK requis).')
    args = parser.parse_args(argv)
    try:
        if args.command == 'multiplayer':
            from lan_server import serve
            serve(args.host, args.port, args.key)
            return 0
        if args.command == 'validate':
            errors = validate(json.loads(args.file.read_text(encoding='utf-8')))
            print(json.dumps({'ok': not errors, 'errors': errors}, ensure_ascii=False, indent=2))
            return int(bool(errors))
        if args.command == 'assets':
            totals, missing = {}, []
            for author in ('kenney', 'quaternius'):
                catalog = json.loads((ROOT / f'assets/free/{author}/models.json').read_text())
                models = catalog if isinstance(catalog, list) else catalog.get('models', [])
                totals[author] = len(models)
                for model in models:
                    for key in ('url', 'thumbnailUrl'):
                        value = model.get(key)
                        if value and not (ROOT / value.removeprefix('./')).is_file():
                            missing.append(value)
            print(json.dumps({'ok': not missing, 'models': totals, 'missing': missing}, indent=2))
            return int(bool(missing))
        if args.command == 'manifest':
            return run_tool(['node', 'scripts/build-runtime-manifest.mjs'])
        if args.command == 'build-native':
            return run_tool(['sh', 'native/build-wasm.sh'])
        if args.command == 'csharp':
            return run_tool(['dotnet', 'run', '--project', 'csharp/WarLike.Bridge'])
        if not 1 <= args.port <= 65535:
            raise ValueError('Le port doit être compris entre 1 et 65535.')
        class Handler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *values, **kwargs):
                super().__init__(*values, directory=str(ROOT), **kwargs)
            def end_headers(self):
                self.send_header('Cache-Control', 'no-cache')
                super().end_headers()
        print(f'WarLike : http://127.0.0.1:{args.port}/', flush=True)
        with http.server.ThreadingHTTPServer(('127.0.0.1', args.port), Handler) as local:
            local.serve_forever()
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(str(error), file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        return 0


if __name__ == '__main__':
    sys.exit(main())
