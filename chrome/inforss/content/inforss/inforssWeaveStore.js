function FooStore() {
   // Maintains the store of all your Foo-type items and their GUIDs.
 }
 FooStore.prototype = {
   __proto__: Store.prototype,
   _logName: "foo",
   itemExists: function(guid) {
     // Return true if an item with given guid exists in the store.
   },
   createRecord: function(guid) {
     // Return the cached one if we have it:
     let record = this.cache.get(guid);
     if (record)
       return record;
     // Otherwise, instantiate:
     record = new FooRecord();
     // Look up the data corresponding to this guid, by the mapping
     // you've defined.
     // Set the data and the guid on the new record:
     record.bar = 17; // or whatever
     record.id = guid;
     // Add it to the cache:
     this.cache.put(guid, record);
     // return the record
     return record;
   },
   changeItemId: function(oldId, newId) {
     // Find the item with guid = oldId and change its guid to newId.
   },
   getAllIds: function() {
     // Return a list of the GUIDs of all items.  Invent GUIDs for any items
     // that don't have them already, and remember the mapping for later use.
   },
   wipe: function() {
     // Delete everything!
   },
   create: function(record) {
     // Create a new item based on the values in record
   },
   update: function(record) {
     // look up the stored record with id = record.id, then set
     // its values to those of new record
   },
   remove: function(record) {
     // look up the stored record with id = record.id, then delete it.
   }
 };
