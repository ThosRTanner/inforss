# Changes for v 2.3.0.0 (pre release)

Rewrote FTP synchronisation. Among other things, the progress bars occupy the whole button, and increase progressively (indicating steps completed, rather than progress of download, sadly) rather than jump around. It also now applies the loaded configuration (previously you could get into a state where after pressing OK, the headline display carried on using the old configuration, but when you the options screen would load the new configuration but the headline display was still using the old configuration, which was confusing).

*NOTE* Using ftp does not work if you have fireftp installed. There's nothing much I can do about this, as it causes certain low level browser functions to cease to work.

*IMPORTANT* The Advanced/synchronisation/manual synchronisation export button exports the *saved* configuration, so make sure you have done an apply first if you have made changes.

Fixes an issue with not being able to subscribe to an atom feed - Issue #271

Fixes an issue with not getting the feed description for an RSS feed

Significantly reworked and simplified scrolling, which
* makes for smoother scrolling when quick filter is applied
* makes fade work with quick filter.
* fixes strangeness when clearing quick filter - Issue #256
* removes some nearly duplicate code, which could result in strange displays when headline styles were changed - Issue #183, Issue #184
* Fixes calculation of required width, which occaionally caused the headlines not to scroll - Issue #120

Note that whilst I have made an attempt to get things to work correctly if you change configuration while the headline bar isn't enabled (in the status bar or at the top, and the appropriate bar is switched off), it's not 100%. You may need to toggle scrolling off and back on.

Considerable reworking of the option window code, which fixes a lot of problems. In particular:
* Some 'click' buttons have been made into command buttons
* Changing the URL of a feed doesn't drop it from groups - Issue #294
* The window behaves more sensibly when all feeds are deleted.
* The case sensitivity for a group filter was being set incorrectly
* 'reset to default group icon' was setting the icon to undefined.
* The Advanced/Repository tab displays the paths correctly.
* The 'view selected' button no longer displays blank lines for unselected feeds when displaying a group - Issue #48.
  * Be aware that this has odd effects on the scrolling, and both the old and new way rely on "unintended" behaviour of the layout engine (though how this is unintended when the 'hidden' attribute is meant to be settable on any element node is open to question). Issue #284 has been raised to rewrite entirely.
* When the option settings are checked for sanity, and a problem is found, the tab with the (first) problem will be selected.
* Note that selecting a new feed will only check the current feed is valid. It no longer checks the advanced tab options, which are only checked when you press OK or apply.
* The last sample headline was not showing the correct colour for recent headlines if set to match normal headlines.
* Rewrote the HTML parsing dialogue somewhat.
  * You always go into the parsing dialogue on creating a new HTML feed. Fixes #131
  * Note that it is no longer permitted to change the url in that dialogue (as there's no sanity checking).
* Filter categories popup is now also populated for HTML feeds
* Some items in the feed group/settings tab are now disabled if they don't make sense
* When applying 'default value' changes to the "current feed", it applies them to the selected current feed in the options window (i.e. as selected from the Basic-Feed/Group tab), not to whatever was selected when the option window opened.
* When applying the 'default value' changes to the "current feed" and the current feed is a group, the group icon will be updated anyway. Answering yes to the prompt will also update all the feeds as appropriate (previously, the group icon never got updated).
* 'Display repository in browser' button now opens a new tab in the window from which the options window was opened, like clicking on any other link.
* Advanced/report display behaves a little more consistently with what is actually currently configured.
* Resetting the configuration from the options window doesn't simultaneously reset the main configuration. Having some things that act instantly and some that don't act till you click OK or Apply is confusion.

If you have selected to show the list of headlines as submenus, then HTML feeds will show a submenu, as well as RSS and Atom feeds

# Changes for v 2.2.0.4

Fixed issue with config not being saved when you selected a new feed from the dialogue box
Fixed issue with not being able to subscribe to palemoon atom feed

# Changes for v 2.2.0.3

Fixed registration of video and audio podcast handlers on basilisk (and firefox)
Fixed conflict with Menu Wizard which calls event handlers with improperly set up events.
Fixes large blank space left in toolbar - Issue #263

# Changes for v 2.2.0.2

The 'banned' icon on a headline was being ignored.

# Changes for v 2.2.0.1

Wasn't displaying any filters if the feed filter list was empty.

# Changes for v 2.2.0.0

Change the scaling of the main icon to match windows padding (Issue #149)

Don't attempt to collapse the bar when switching from in status bar to top/bottom (Issue #220, Issue #242)

A lot of refactoring done to clean up start up and shutdown of extension as windows are added and removed (Issue #251, #228, #221)

Removed the 'Manual synchronisation' button as it never did anything (Issue #162)

Rationalised the quick filter implementation a bit. Specifically, if you have a
quick filter set up, it will apply even to blank headlines.

The buttons that get stored in the configuration will now give you a warning box if the option window is open rather than taking effect.

Fixes tooltips on enclosure icons being lost when the quick filter was activated

Removes all of twitter support as they stopped doing an RSS feed (Issue #101). There are several websites that will provide RSS feeds for twitter. Please sign up to one of those, and add the RSS feed into inforss. If there is call for this, I'll work on adding one or more into the 'new feed' screen.

Removes all the support for creating feeds from blog searches, as none of them work any more - the sites are dead or no longer support searching (Issue #100). There are some sites which provide RSS feeds for blogs which can be then plugged into infoRSS.

The options window has been given some overdue care and attention. Among other things:
* it now resizes sensibly (Issues #13, #45)
* the filter list is displayed nicely and doesn't lose numeric values. (Issue #260)
* the up / down errors on the feed selector popup will disappear when not applicable.
* The lists of translators and contributors in the credits tab is now driven from install.rdf

# Changes for v 2.1.0.1

Reverted the add on ID as the new phoebus system isn't happy

# Changes for v 2.1.0.0

WARNING: ID of the extension has changed from inforss-reloaded@addons.palemoon.org to inforss-reloaded@addons.nowhere.org. You will need to uninstall the old version before you install this.

Fixes tooltips on headline bar (Issue #194)

Replace deprecated route to Console.jsm (Issue #195)

Fixed a problem with enclosures not working correctly.

Changed all XMLHttpRequest to privileged version (Issue #192)

Fixed a bug in the manual html feed parser if there was no encoding found.

Remove the requirement for username and password on https sites when manually adding a feed.

Made a little more resilient to poorly structured feeds.

New headline behaviour changes
* Removed some unused code (Issue #211)
* Made the sound for new headline use SystemNotification sound (rather than Notify, which doesn't exist)
* use locale time format in the toast message
* Stopped the playing of the sound being dependant on the toast being enabled.

Fixes for multiple windows
* Fixed multiple 'new feed' messages if you clicked in the RSS icon in the address bar (Issue #228)
* Added feeds weren't appearing in other windows

Remove (finally) all thunderbird references

Fixed OPML import (Issue #34). However, OPML import will only affect the configuration being editted and you will have to save it (previously it updated the global config).

Reworked handling of feed deletion a lot. Fixes Issue #176, Issue #173, Issue #150.

Now works with basilisk. If you have status-4-evar installed, it inforss will be able to use the status bar. Otherwise, selecting display in status bar will behave as though you'd selected display at bottom.

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
  * The 'inforss.color.sameas' section will read incorrectly for non-english languages.
  * Previously if you set the background to something that required the foreground to be white, then the non-recent headline text would also be white, and thus usually invisible. This doesn't happen now.
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
