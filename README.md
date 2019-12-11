# inforss

inforss newsreader for palemoon

This is a fork of [infoRSS by Didier Ernot](http://inforss.mozdev.org/index.html) and was created from the distributed xpi from mozdev and a 2nd version from the palemoon forums. Icons used by kind permission of the original author.

## CI status

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/f53b72b001a64359a9ee475049d5e7c9)](https://app.codacy.com/app/ThosRTanner/inforss?utm_source=github.com&utm_medium=referral&utm_content=ThosRTanner/inforss&utm_campaign=Badge_Grade_Settings)

## Formatting

* Javascript: [JS Beautifier](http://jsbeautifier.org/). Settings (currently): 2 space indent, brace on own line, detect packers, space before conditional
* CSS: [CSS beautifier](http://www.cleancss.com/css-beautify/) Settings (currently): 4 space indent, but otherwise pretty much same as JS.
However, the braces on own line doesn't work, so done manually
* XUL - currently cleaned in [notepad++](https://notepad-plus-plus.org/) with 'pretty print xml', followed by 'pretty print xml (attributes)'

Note: Check with care. Formatting validation is done via the various linters provided by codacy

## Notes on behaviour

* 'disable' attribute only works for certain element types and you can't disable (e.g.) a groupbox (hence why the feed/group box gets blanked out rather than disabled when no feeds left)
* 'disable' doesn't affect 'click' event (despite all the documentation implying it should), so use 'command' events for preference
* 'hidden' doesn't work properly on listitem objects (note the HTML spec suggests you can use hidden on everything).
