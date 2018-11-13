# Changes for v 2.0.3.4

Fixes tooltips on headline bar (Issue #194)
Replace deprecated route to Console.jsm (Issue #195)
Fixed problem with enclosures.
Changed all XMLHttpRequest to privileged version, fixes Issue #192.
Fixed a bug in the manual html feed parser if there was no encoding found
Remove the requirement for username and password for https sites.

# Changes for v 2.0.3.3

Fix startup issue (Issue #186)

# Changes for v 2.0.3.2

Fix hanging when installing on Palemoon 28

# Changes for v 2.0.3.1

Fix issue where inforss would go wrong when being installed for the first time.

# Changes for v 2.0.3.0

Stop hanging the browser for a long time when marking a news feed as read if there are a lot if items (Issue #39)

Remove some global definitions and put into a namespace, also did a little bit of refactoring (Issue #160). Note there is still work to be done on this.

Fixes a silly error with cycling groups

Creating a new group now uses the default group icon

The group list on the advanced/defaults page now shows groups again (Issue #171)

More work on cleanup, incidentally fixing an issue where the magnifier on the tiny preview window went funny after about 10 seconds.

Fixed an issue where if you tried to add a feed and the website timed out, nothing happened. It now gives an error popup.

Reworked the NNTP feed handler a lot - it might be a bit faster, but now, more importantly, it goes through the same headline processing as all other feeds.
* NOTE: It now has a new way of determining a unique ID (it uses the message ID), which may cause messages to be redisplayed.

Stop headlines from feeds that contain every headline they've ever received continually reappearing (Issue #7).

# Changes for v 2.0.2.0

inforss.xml is now at version 8

Headline style selection:
* The headline colour selector has moved from 'headline' section to 'recent headline' section (Issue #134). There's a couple of things you should note:
** The 'inforss.color.sameas' section will read incorrectly for non-english languages.
** Previously if you set the background to something that required the foreground to be white, then the non-recent headline text would also be white, and thus usually invisible. This doesn't happen now.
* 'Default' foreground (i.e. text) colour now selects the window foreground colour. If you want black, select black! This looks a lot better when you use personas.
* All the colour pickers have been changed to use the underlying html colour picker. This gives you the ability to pick from the full gamut of RGB colours. (Issue #135)

Podcasts:
Podcast saving didn't used to work at all. Also, any podcast will be saved, not just audio.

Status bar:
Don't put a space in the status bar if the headlines aren't there (Issue #144)
Fixed the resizing of the headline area in the status bar (Issue #47). This should behave a little better now if you release the mouse after dragging it off the status bar when resizing.

Supports feeds with non-utf8 encodings again (Issue #147)

Rewrote the way feeds were scheduled (Issue #103). Hopefully this makes next and previous buttons behave more sensibly and predictably. Added a lot of documentation in the Wiki (or in github issues to update the wiki) about how cycling works. I've also reduced the time between fetches in groups to 15 seconds (1.5 * the HTML timeout).

## Localisations

inforss.color.sameas has changed and needs re-translating.
inforss.red, inforss.green and inforss.blue have all been removed.

# Changes for v 2.0.1.0

inforss.xml is now at version 7

If web site supplies changed information, this will be used to avoid recalculation of headlines (See Issue #92)

Register for video and audio news feeds (Issue #32). this also registers the feed handler with the name "infoRSS Reloaded" rather than InfoRSS
* Note: Fiddling with the config that way appears to require a restart, even if if is the official method.

Produce an alert if you attempt to add a new feed or modify an individual feed when the options dialogue is already open (Issue #83)

Fixed creation of atom feeds causing them to have the wrong home page (Issue #88)

Improved configuration of html feeds, so that it guess the encoding a lot better, and removed a bunch of nearly duplicate code. Note that you will probably need to specify the encoding as 'manual' if it is specified in an html meta tag (even though the screen will likely work it out correctly)

Options screen:
* Removed the 0/-1 mouse button setting as that is now specified by the standard.
* Added up-to-date links to help pages to options screen help tab.
* Removed the rather dead 'Automatic report to author' in the Advanced/debug tab

Popup menu:
* Make right click on feed open the options dialogue with the selected feed selected (!) (Issue #68)
* List of feeds on page now back (no issue)
* Livemarks now back (Issue #49)
* The 'light' in a feed status (or advanced/report tab) will show grey if the feed is not being scanned, or until it has been scanned. If there is an error, the light will show red. (Issues #14, #15)

Headline bar:
* Fixes the flashing icon not flashing and headlines not fading in/out.
* Small tweak to make some of the icons look better (Issue #91)
* Initial display of headline bar will use the default icon (Issue #95)

## Localisations

Added the following to all .properties files

    inforss.option.dialogue.open: The options dialogue is already open.\nSave or abandon your changes.

Added the following to all inforss.dtd files

    <!ENTITY about.help.original.label "Original help info">

Removed the following from all inforss.dtd files

    <!ENTITY inforss.debug.net "...">

# Changes for v 2.0.0.0

Stop generating user IDs of `null`, and remove from `inforss.xml`.
Also cleaned up the loading of the file and updating from previous versions. In particular, this should cope with old versions of the file so message `inforss.wrongVersionXmlFile` has been removed.

OPML import/export progress bars look a little better. Note however that OPML import is broken and is currently disabled.

Options screen:
* Basic: Feeds/Group
  * Selection menu shows feed icons
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

Fixed some issues with the way guids (RSS) / ids (Atom) were handled. **Note:**
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
