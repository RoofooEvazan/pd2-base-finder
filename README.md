# PD2 Base Finder

For **Project Diablo 2**: the earliest point in the game an item base can drop, and the earliest point it can roll the sockets you want. A second tab lists every base that can drop in a chosen area.

**Live site:** https://roofooevazan.github.io/pd2-base-finder/

Companion sites: [PD2 Calculators](https://roofooevazan.github.io/) · [PD2 IAS Calculator](https://roofooevazan.github.io/pd2-ias-calc/) · [PD2 Hit Chance](https://roofooevazan.github.io/pd2-hit-chance/)

## How the numbers were established

- **Drop pool**: walks PD2's `TreasureClassEx` upgrade chains to find the highest `weapN` / `armoN` group reachable at each monster level.
- **Monster level**: Nightmare and Hell use `Levels.txt` `MonLvl2Ex` / `MonLvl3Ex`; Normal uses each monster's `MonStats` level (the strongest regular monster in the area). Champions + 2, uniques and minions + 3.
- **Sockets**: ilvl = mlvl; min(`gemsockets`, the item type's `MaxSock1` / `MaxSock25` / `MaxSock40` for ilvl ≤ 25 / ≤ 40 / > 40), the D2Common rule that also caps Larzuk's puzzlebox, cube socket recipes and corruption.

Data comes from PD2's `data.zip` (launcher copy), `data/global/excel`. Everything runs in your browser, with no server or tracking.

## Updating the site

Edit the files and commit; GitHub Pages republishes within a minute or two. After a PD2 patch, extract `data/global/excel` from the launcher's `data.zip` and run:

```
node tools/build-data.js path/to/excel > data.js
```

## Disclaimer

This is a fan-made tool. It is not affiliated with or endorsed by Blizzard Entertainment or the Project Diablo 2 team. Diablo is a trademark of Blizzard Entertainment. No game assets are included.
