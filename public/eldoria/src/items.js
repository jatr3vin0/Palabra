// Item metadata: names/art/flavor for the inventory, shops and item-get banners.
// The actual grant logic lives in GameScene.give().
window.ITEMS = {
  sword:          { name: 'Espada de madera', art: 'swordItem', kind: 'passive', desc: '¡Pulsa ESPACIO para atacar!' },
  heroSword:      { name: 'Espada del héroe', art: 'heroSword', kind: 'passive', flag: 'has_heroSword', desc: '¡Filo legendario! Corta el doble.' },
  bow:            { name: 'Arco de caza', art: 'bow', kind: 'equip', flag: 'has_bow', desc: '¡Pulsa X para disparar flechas!' },
  bombBag:        { name: 'Bolsa de bombas', art: 'bombItem', kind: 'equip', flag: 'has_bombBag', desc: '¡Pulsa X para poner bombas. ¡Bum!' },
  lantern:        { name: 'Linterna', art: 'lantern', kind: 'equip', flag: 'has_lantern', desc: 'Alumbra antorchas y cuevas.' },
  boots:          { name: 'Botas de poder', art: 'boots', kind: 'passive', flag: 'has_boots', desc: 'Corre más. ¡Seguro en el hielo!' },
  potion:         { name: 'Poción roja', art: 'potion', kind: 'equip', desc: 'Pulsa X para beber. ¡Cura del todo!' },
  oakCharm:       { name: 'Amuleto de Roble', art: 'oakCharm', kind: 'passive', flag: 'has_oakCharm', desc: 'Regalo de Nutwick. ¡Mitad de daño!' },
  shardEmerald:   { name: 'Pedazo de esmeralda', art: 'shardEmerald', kind: 'shard', desc: '¡Un pedazo de la Corona de Eldoria!' },
  shardRuby:      { name: 'Pedazo de rubí', art: 'shardRuby', kind: 'shard', desc: '¡Un pedazo de la Corona de Eldoria!' },
  shardSapphire:  { name: 'Pedazo de zafiro', art: 'shardSapphire', kind: 'shard', desc: '¡Un pedazo de la Corona de Eldoria!' },
  heartContainer: { name: 'Corazón nuevo', art: 'heartContainer', kind: 'special', desc: '¡Tu vida crece un corazón!' },
  smallKey:       { name: 'Llave pequeña', art: 'smallKey', kind: 'special', desc: 'Abre una puerta cerrada aquí.' },
  bossKey:        { name: 'Llave grande', art: 'bossKey', kind: 'special', desc: '¡Abre la puerta del jefe!' },
  acorn:          { name: 'Bellota dorada', art: 'acorn', kind: 'special', desc: 'Nutwick las colecciona...' },
  crown:          { name: 'Corona de Eldoria', art: 'crown', kind: 'special', desc: '¡Reforjada y brillante!' },
};

// dungeons -> the shard their boss drops
window.DUNGEON_SHARDS = {
  dungeon1: 'shardEmerald',
  dungeon2: 'shardRuby',
  dungeon3: 'shardSapphire',
};

// the X-button equipment ring, in cycle order
window.EQUIPPABLES = ['bow', 'bombBag', 'lantern', 'potion'];
