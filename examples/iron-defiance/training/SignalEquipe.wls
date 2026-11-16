// Iron Defiance · WarScript d'initiation
// Attacher à un objet via Ajouter un composant > Jeu Web > WarScript.
// P en Play émet le signal qu'un Blueprint peut écouter.
public int signalCount = 0;
Start() {
    Log("Iron Defiance : WarScript actif.");
}
Update() {
    if (Input.GetKeyDown("p")) {
        signalCount += 1;
        Set("iron_manual_signal_count", signalCount);
        Signal("iron:academy:manual");
        Log("Signal Iron Defiance transmis.");
    }
}
