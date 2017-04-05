# Changes for v xxxx

Stop generating user IDs of `null`, and remove from `inforss.xml`.
Also cleaned up the loading of the file and updating from previous versions. In particular, this should cope with old versions of the file so message `inforss.wrongVersionXmlFile` has been removed.

OPML import/export progress bars look a little better. Note however that OPML import is broken and is currently disabled.

Options screen:
* Basic: Feeds/Group
 *  Selection menu shows feed icons
 * Feed list for group sizes feed icons correctly
 * Extra space for feed report so it doesn't generate a scroll bar
* Advanced: Default values and Advanced: Report list sizes feed icons correctly

Popup boxes now have inforss title so you can see where they come from

Removed all the version number entries in the localisation files and use the add-on version string instead.

Added documentation in `default/prefs.js` for all the inforss `about:config` entries.

Makes a much better attempt at getting the default icon for a feed.

Lots of dead code removal, reformatting and jshinting.

Dropped legacy drag-and-drop code, now using standard version
* Cleaned up a lot of logic so it's clearer what can be dropped where

Option screen will pop to front when you right click the main icon
* I've also stopped right clicking on a feed in the menu from generating a new window every time you click it and it will bring forward the settings window if one already exists.
