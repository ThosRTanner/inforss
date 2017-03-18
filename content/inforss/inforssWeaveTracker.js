function FooTracker()
{
  this._init();
}
FooTracker.prototype = {
  __proto__: Tracker.prototype,
  _logName: "FooTracker",
  file: "foo",

  _init: function FooTracker_init()
  {
    // The ugly syntax on the next line calls the base class's init method:
    this.__proto__.__proto__.init.call(this);
    /* Here is where you would register your tracker as an observer, so that
       its onEvent() (or other appropriately named) method can be called
       in response to events. */
  },

  onEvent: function FooTracker_onEvent()
  {
    /* Here is where you'd handle the event.  See the documentation for
       whatever service you are observing to find out what to call this
       method, what arguments to expect, and how to interpret them. */
    var guid = 0;

    /* Here is where you'd include code to figure out the GUID of the item
       that has changed... */
    this.addChangedId(guid);

    // Update the score as you see fit:
    this._score += 10;
  }
};
