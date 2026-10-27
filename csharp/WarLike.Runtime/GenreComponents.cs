namespace WarLike.Runtime;

// Genre behaviours are deterministic native prototypes. The browser's Blueprint
// system handles the same gameplay ideas independently during Web Play.
public sealed class RoleplayComponent : WarLikeBehaviour {
    public int Money { get; set; } = 50;
    public int Reputation { get; set; }
    public void Work() { Money = Math.Min(1_000_000, Money + 20); Reputation = Math.Min(1000, Reputation + 1); }
    public bool BuySupplies() { if (Money < 10) return false; Money -= 10; return true; }
}
public sealed class RacingRulesComponent : WarLikeBehaviour {
    public float Elapsed { get; private set; }
    public int Checkpoints { get; private set; }
    public bool Started { get; private set; }
    public bool Finished { get; private set; }
    public void StartRace() { Elapsed = 0; Checkpoints = 0; Started = true; Finished = false; }
    public bool PassCheckpoint() { if (!Started || Finished) return false; Checkpoints++; return true; }
    public bool FinishRace() { if (!Started || Finished || Checkpoints < 1) return false; Finished = true; return true; }
    public override void Update(float deltaTime) {
        if (Started && !Finished && float.IsFinite(deltaTime) && deltaTime > 0)
            Elapsed += Math.Clamp(deltaTime, 0, .25f);
    }
}
public sealed class SimulationEconomyComponent : WarLikeBehaviour {
    public int Money { get; set; } = 100;
    public int Materials { get; set; } = 5;
    public int Maintenance { get; private set; }
    public void Produce() => Materials = Math.Min(1_000_000, Materials + 2);
    public bool FulfillOrder() {
        if (Materials < 1) return false;
        Materials--; Money = Math.Min(1_000_000, Money + 25); return true;
    }
    public void ServiceMachine() => Maintenance = Math.Min(100, Maintenance + 1);
}
public sealed class RpgProgressionComponent : WarLikeBehaviour {
    public int Experience { get; private set; }
    public int Level => 1 + Experience / 100;
    public int Gold { get; set; } = 100;
    public bool QuestActive { get; private set; }
    public void StartQuest() => QuestActive = true;
    public bool CompleteQuest() {
        if (!QuestActive) return false;
        QuestActive = false; Experience = Math.Min(1_000_000, Experience + 50); return true;
    }
    public bool BuyPotion() { if (Gold < 10) return false; Gold -= 10; return true; }
}
public sealed class FourXEmpireComponent : WarLikeBehaviour {
    public int Turn { get; private set; } = 1;
    public int Food { get; private set; } = 12;
    public int Industry { get; private set; } = 8;
    public int Science { get; private set; } = 3;
    public int Territory { get; private set; } = 1;
    public int Army { get; private set; } = 2;
    public void Explore() => Science = Math.Min(1_000_000, Science + 2);
    public bool Expand() { if (Food < 2) return false; Food -= 2; Territory++; return true; }
    public void Exploit() => Industry = Math.Min(1_000_000, Industry + 3);
    public bool Conquer() { if (Army < 1) return false; Army--; Territory++; return true; }
    public void NextTurn() {
        if (Turn >= 1_000_000) return;
        Turn++; Food += 3; Industry += 2; Science++;
    }
}
