const MAX_MAP_ITEMS_PER_KEY = 512;

Set.prototype.pack = function(storage_key) {
  let source = Array.from(this).sort();
  let total = source.length;
  let keys = [];
  let result = {};
  
  for (let index = 0; index * MAX_MAP_ITEMS_PER_KEY < total; index++) {
    result[`${storage_key}_${index}`] = source.slice(
      index * MAX_MAP_ITEMS_PER_KEY,
      (index + 1) * MAX_MAP_ITEMS_PER_KEY
    );
    keys.push(`${storage_key}_${index}`);
  }

  result[`${storage_key}_keys`] = keys;
  return result;
};

function unpackSet(data, storage_key) {
  let result = new Set();
  if (Array.isArray(data[`${storage_key}_keys`])) {
    for (var key of data[`${storage_key}_keys`]) {
       result = new Set([...result, ...data[key]]);
    }
  }
  return result;
}
