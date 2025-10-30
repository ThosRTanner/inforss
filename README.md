# inforss

inforss newsreader for palemoon

This is a fork of [infoRSS by Didier Ernot](http://inforss.mozdev.org/index.html) and was created from the distributed xpi from mozdev and a 2nd version from the palemoon forums. Icons used by kind permission of the original author.

## CI status

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/f53b72b001a64359a9ee475049d5e7c9)](https://app.codacy.com/app/ThosRTanner/inforss?utm_source=github.com&utm_medium=referral&utm_content=ThosRTanner/inforss&utm_campaign=Badge_Grade_Settings)

## Compatibility notes

* There is an issue with feedburner feeds, in that they do not like having the Sec- request headers set and will return a 403 error (this happens with other feed readers as well). Palemoon 33.3.0 introduced these headers. So if you are using palemoon 33.3.0 and are subscribed to any feedburner feeds, you need to set the `network.http.secfetch.enabled` preference in `about:config` to false

* You can't use the ftp backup facility if you have the fireftp extension enabled.

## Browser compatibility

Although this works with seamonkey and waterfox classic, as of last time I tried, this does require an up-to-date version of Javascript and I can't guarantee this in the future.

## Programming notes

### Formatting

* Javascript: [JS Beautifier](http://jsbeautifier.org/). Settings (currently): 2 space indent, brace on own line, detect packers, space before conditional
* CSS: [CSS beautifier](http://www.cleancss.com/css-beautify/) Settings (currently): 4 space indent, but otherwise pretty much same as JS.
However, the braces on own line doesn't work, so done manually
* XUL - currently cleaned in [notepad++](https://notepad-plus-plus.org/) with 'pretty print xml', followed by 'pretty print xml (attributes)'

Note: Check with care. Formatting validation is checked via various linters provided by codacy

### Screen behaviour

* 'disable' attribute only works for certain element types and you can't disable (e.g.) a groupbox (hence why the feed/group box gets blanked out rather than disabled when no feeds left)
* 'disable' doesn't affect 'click' event (despite all the documentation implying it should), so use 'command' events for preference or make an explicit check)
* 'hidden' doesn't work properly on listitem objects (note the HTML spec suggests you can use hidden on everything).
