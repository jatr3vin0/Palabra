// Item metadata: names/art/flavor for the inventory, shops and item-get banners.
// The actual grant logic lives in GameScene.give().
window.ITEMS = {
  sword:          { name: 'Bordón de peregrino', art: 'swordItem', kind: 'passive', desc: '¡Pulsa ESPACIO para golpear!' },
  heroSword:      { name: 'Espada del Espíritu', art: 'heroSword', kind: 'passive', flag: 'has_heroSword', desc: 'La Palabra de Dios. Corta doble.' },
  bow:            { name: 'Arco de caza', art: 'bow', kind: 'equip', flag: 'has_bow', desc: '¡Pulsa X para disparar flechas!' },
  bombBag:        { name: 'Bolsa de bombas', art: 'bombItem', kind: 'equip', flag: 'has_bombBag', desc: '¡Pulsa X para poner bombas. ¡Bum!' },
  lantern:        { name: 'Lámpara a mis pies', art: 'lantern', kind: 'equip', flag: 'has_lantern', desc: 'Alumbra antorchas y cuevas.' },
  boots:          { name: 'Calzado del evangelio', art: 'boots', kind: 'passive', flag: 'has_boots', desc: 'Corre más. ¡Seguro en el hielo!' },
  potion:         { name: 'Poción roja', art: 'potion', kind: 'equip', desc: 'Pulsa X para beber. ¡Cura del todo!' },
  oakCharm:       { name: 'Escudo de la fe', art: 'oakCharm', kind: 'passive', flag: 'has_oakCharm', desc: 'Regalo de Nutwick. ¡Mitad de daño!' },
  shardEmerald:   { name: 'Sello de esmeralda', art: 'shardEmerald', kind: 'shard', desc: 'Un sello del Rollo del Rey.' },
  shardRuby:      { name: 'Sello de rubí', art: 'shardRuby', kind: 'shard', desc: 'Un sello del Rollo del Rey.' },
  shardSapphire:  { name: 'Sello de zafiro', art: 'shardSapphire', kind: 'shard', desc: 'Un sello del Rollo del Rey.' },
  heartContainer: { name: 'Corazón nuevo', art: 'heartContainer', kind: 'special', desc: '¡Tu vida crece un corazón!' },
  smallKey:       { name: 'Llave pequeña', art: 'smallKey', kind: 'special', desc: 'Abre una puerta cerrada aquí.' },
  bossKey:        { name: 'Llave de la Promesa', art: 'bossKey', kind: 'special', desc: 'Abre la última puerta.' },
  acorn:          { name: 'Bellota dorada', art: 'acorn', kind: 'special', desc: 'Nutwick las colecciona...' },
  crown:          { name: 'Corona de la Vida', art: 'crown', kind: 'special', desc: 'El Rey te la da. Es un regalo.' },
};

// dungeons -> the shard their boss drops
window.DUNGEON_SHARDS = {
  dungeon1: 'shardEmerald',
  dungeon2: 'shardRuby',
  dungeon3: 'shardSapphire',
};

// the X-button equipment ring, in cycle order
window.EQUIPPABLES = ['bow', 'bombBag', 'lantern', 'potion'];
