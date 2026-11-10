// World registry + lookup helpers. Content files merge rooms into WORLD.maps.
window.WORLD = {
  maps: {
    overworld: { kind: 'overworld', rooms: {} },
  },

  // biome -> base ground char painted under transparent prop tiles
  baseGround: {
    meadows: '.', forest: '.', lake: '.', swamp: '.',
    desert: 's', mountains: 'n', wastes: 'e',
  },

  // biome / map -> music key
  biomeMusic: {
    meadows: 'meadows', forest: 'forest', lake: 'lake', swamp: 'swamp',
    desert: 'desert', mountains: 'mountains', wastes: 'wastes',
  },

  room(mapId, roomKey) {
    const m = this.maps[mapId];
    return m && m.rooms ? m.rooms[roomKey] || null : null;
  },

  musicFor(mapId, room) {
    const m = this.maps[mapId];
    if (m && m.music) return m.music;
    if (room && room.biome && this.biomeMusic[room.biome]) return this.biomeMusic[room.biome];
    if (mapId === 'interiors') return 'meadows';
    return 'meadows';
  },

  groundFor(mapId, room) {
    if (mapId === 'overworld') return this.baseGround[(room && room.biome) || 'meadows'] || '.';
    if (mapId === 'interiors') return 'e';
    return 'd'; // dungeons
  },
};
