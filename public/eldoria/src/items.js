// Item metadata: names/art/flavor for the inventory, shops and item-get banners.
// The actual grant logic lives in GameScene.give().
window.ITEMS = {
  sword:          { name: 'Wooden Sword', art: 'swordItem', kind: 'passive', desc: 'Press SPACE to slash!' },
  heroSword:      { name: "Hero's Blade", art: 'heroSword', kind: 'passive', flag: 'has_heroSword', desc: 'Legendary edge. Double damage!' },
  bow:            { name: 'Hunting Bow', art: 'bow', kind: 'equip', flag: 'has_bow', desc: 'Press X to shoot arrows!' },
  bombBag:        { name: 'Bomb Bag', art: 'bombItem', kind: 'equip', flag: 'has_bombBag', desc: 'Press X to drop bombs. Boom!' },
  lantern:        { name: 'Lantern', art: 'lantern', kind: 'equip', flag: 'has_lantern', desc: 'Lights torches and dark rooms.' },
  boots:          { name: 'Power Boots', art: 'boots', kind: 'passive', flag: 'has_boots', desc: 'Run faster. Sure-footed on ice!' },
  potion:         { name: 'Red Potion', art: 'potion', kind: 'equip', desc: 'Press X to drink. Full hearts!' },
  oakCharm:       { name: 'Oak Charm', art: 'oakCharm', kind: 'passive', flag: 'has_oakCharm', desc: "Nutwick's blessing. Halves damage!" },
  shardEmerald:   { name: 'Emerald Shard', art: 'shardEmerald', kind: 'shard', desc: 'A piece of the Crown of Eldoria!' },
  shardRuby:      { name: 'Ruby Shard', art: 'shardRuby', kind: 'shard', desc: 'A piece of the Crown of Eldoria!' },
  shardSapphire:  { name: 'Sapphire Shard', art: 'shardSapphire', kind: 'shard', desc: 'A piece of the Crown of Eldoria!' },
  heartContainer: { name: 'Heart Container', art: 'heartContainer', kind: 'special', desc: 'Your life grows by one heart!' },
  smallKey:       { name: 'Small Key', art: 'smallKey', kind: 'special', desc: 'Opens a locked door here.' },
  bossKey:        { name: 'Big Key', art: 'bossKey', kind: 'special', desc: "Opens this dungeon's boss door!" },
  acorn:          { name: 'Golden Acorn', art: 'acorn', kind: 'special', desc: 'Nutwick collects these...' },
  crown:          { name: 'Crown of Eldoria', art: 'crown', kind: 'special', desc: 'Reforged and shining!' },
};

// dungeons -> the shard their boss drops
window.DUNGEON_SHARDS = {
  dungeon1: 'shardEmerald',
  dungeon2: 'shardRuby',
  dungeon3: 'shardSapphire',
};

// the X-button equipment ring, in cycle order
window.EQUIPPABLES = ['bow', 'bombBag', 'lantern', 'potion'];
