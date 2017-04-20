# Changes for v 2.0.x.x

Small tweak to make some of the icons look better (Issue #91)

# Changes for v 2.0.0.0

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
* Removed code for legacy password API
* Dropped legacy drag-and-drop code, now using standard version
 * Cleaned up a lot of logic so it's clearer what can be dropped where

Option screen will pop to front when you right click the main icon
* I've also stopped right clicking on a feed in the menu from generating a new window every time you click it and it will bring forward the settings window if one already exists.

Fixed the way history was accessed, which depended on a withdrawn API.

Fixed some issues with the way guids (RSS) / ids (Atom) were handled.
**Note:**
* This might cause some old headlines to be redisplayed.
* A log entry is made in the browser console where the guid and the link are different. This may be an issue as the code uses the guid for preference for RSS feeds, unless it is marked as 'not a perma link'.
* Stories with no linked page are linked to the feeds home page.

Choses which link to display for Atom feeds better.

News items with empty titles are now displayed rather than dropped. They are given a title of "(no title)".

Code no longer suppresses errors if it can't get hold of a feeds page (at least from settings window or when displaying pages as a sub-menu).

## Localisation

Following labels were missing from most .properties files

    inforss.new.for=For:
    inforss.new.twitter.account=Account:
    inforss.new.twitter.id=ID:

Added the following new entity

    <!ENTITY about.wiki               "InfoRSS wiki">

Added en-GB localisation
