/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is infoRSS.
 *
 * The Initial Developer of the Original Code is
 *   Didier Ernotte <didier@ernotte.com>.
 * Portions created by the Initial Developer are Copyright (C) 2004
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Didier Ernotte <didier@ernotte.com>.
 *   Tom Tanner
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
//------------------------------------------------------------------------------
// inforss_Options_Basic_Headlines_Style
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Headlines_Style", /* exported Headlines_Style */
];
/* eslint-enable array-bracket-newline */

const { add_event_listeners } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { Base } = Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Base.jsm",
  {}
);

/** Contains the code for the 'Basic' tab in the option screen.
 *
 * @param {Document} document - The options window this._document.
 * @param {Options} options - Main options window class for some common code.
 */
function Headlines_Style(document, options)
{
  Base.call(this, document, options);

  this._display_favicon = document.getElementById("favicon");
  this._display_enclosure = document.getElementById("displayEnclosure");
  this._display_banned = document.getElementById("displayBanned");
  this._font_menu = document.getElementById("fresh-font");
  this._use_default_font_size = document.getElementById("fontSize");
  this._font_size = document.getElementById("fontSize1");
  this._use_foreground_colour =
    document.getElementById("defaultForegroundColor");
  this._foreground_colour = document.getElementById("defaultManualColor");
  this._recent_italic = document.getElementById("inforss.italic");
  this._recent_bold = document.getElementById("inforss.bold");
  this._recent_use_background_colour =
    document.getElementById("backgroundColor");
  this._recent_background_colour =
    document.getElementById("backgroundManualColor");
  this._recent_foreground_colour_mode =
    document.getElementById("foregroundColor");
  this._recent_foreground_colour = document.getElementById("manualColor");

  const update_headline_bar = (box, event) =>
    [ box, event, this._update_sample_headline_bar ];

  this._listeners = add_event_listeners(
    this,
    document,
    update_headline_bar(this._display_favicon, "command"),
    update_headline_bar(this._display_enclosure, "command"),
    update_headline_bar(this._display_banned, "command"),
    update_headline_bar(this._font_menu, "command"),
    update_headline_bar(this._use_default_font_size, "command"),
    update_headline_bar(this._font_size, "mousemove"),
    update_headline_bar(this._use_foreground_colour, "command"),
    update_headline_bar(this._foreground_colour, "input"),
    update_headline_bar(this._recent_italic, "command"),
    update_headline_bar(this._recent_bold, "command"),
    update_headline_bar(this._recent_use_background_colour, "command"),
    update_headline_bar(this._recent_background_colour, "input"),
    update_headline_bar(this._recent_foreground_colour_mode, "command"),
    update_headline_bar(this._recent_foreground_colour, "input")
  );

  //Populate the font menu.
  //Note: Whilst arguably we should respond to font add/removal events and
  //display the current font list whenever clicked, the old code didn't,
  //and I still think this is the best place to deal with this.
  //this API is almost completely undocumented.
  const FontService = Components.classes[
    "@mozilla.org/gfx/fontenumerator;1"].getService(
    Components.interfaces.nsIFontEnumerator);

  for (const font of FontService.EnumerateAllFonts({ value: null }))
  {
    const element = this._font_menu.appendItem(font, font);
    element.style.fontFamily = font;
  }
}

const Super = Base.prototype;
Headlines_Style.prototype = Object.create(Super);
Headlines_Style.prototype.constructor = Headlines_Style;

Object.assign(Headlines_Style.prototype, {

  /** Config has been loaded.
   *
   * @param {Config} config - New config.
   */
  config_loaded(config)
  {
    Super.config_loaded.call(this, config);

    // ----------- Headlines style -----------

    //Display feed icon
    this._display_favicon.selectedIndex =
      this._config.headline_shows_feed_icon ? 0 : 1;

    //Display enclosure icon
    this._display_enclosure.selectedIndex =
      this._config.headline_shows_enclosure_icon ? 0 : 1;

    //Display banned icon
    this._display_banned.selectedIndex =
      this._config.headline_shows_ban_icon ? 0 : 1;

    //Font
    {
      const headline_font = this._config.headline_font_family;
      const font_menu = this._font_menu;
      font_menu.selectedIndex = 0;
      for (const font of font_menu.childNodes[0].childNodes)
      {
        if (headline_font == font.getAttribute("value"))
        {
          break;
        }
        font_menu.selectedIndex += 1;
      }
    }

    //Font size
    {
      const fontSize = this._config.headline_font_size;
      if (fontSize == "inherit")
      {
        this._use_default_font_size.selectedIndex = 0;
      }
      else
      {
        this._use_default_font_size.selectedIndex = 1;
        //fontsize is in pt so strip that off
        this._font_size.value = parseInt(fontSize, 10);
      }
    }

    //Foregound colour
    //Sigh magic values again
    {
      const defaultForegroundColor = this._config.headline_text_colour;
      if (defaultForegroundColor == "default")
      {
        this._use_foreground_colour.selectedIndex = 0;
        this._foreground_colour.value = '#000000';
      }
      else
      {
        this._use_foreground_colour.selectedIndex = 1;
        this._foreground_colour.value = defaultForegroundColor;
      }
    }

    // ----------- Recent Headline style -----------

    //Highlight delay (i.e. time after which it is no longer recent)
    this._document.getElementById("delay1").value =
      this._config.recent_headline_max_age;

    //Style (italic, bold)
    this._recent_italic.checked =
      this._config.recent_headline_font_style != "normal";
    this._recent_bold.checked =
      this._config.recent_headline_font_weight != "normal";

    //Background colour.
    const background_colour = this._config.recent_headline_background_colour;
    if (background_colour == "inherit")
    {
      this._recent_use_background_colour.selectedIndex = 0;
      this._recent_background_colour.value = "#000000";
    }
    else
    {
      this._recent_use_background_colour.selectedIndex = 1;
      this._recent_background_colour.value = background_colour;
    }

    //Foreground colour
    const foregroundColor = this._config.recent_headline_text_colour;
    switch (foregroundColor)
    {
      case "auto":
        this._recent_foreground_colour_mode.selectedIndex = 0;
        this._recent_foreground_colour.value = "#000000";
        break;

      case "sameas":
        this._recent_foreground_colour_mode.selectedIndex = 1;
        this._recent_foreground_colour.value = this._foreground_colour.value;
        break;

      default:
        this._recent_foreground_colour_mode.selectedIndex = 2;
        this._recent_foreground_colour.value = foregroundColor;
    }

    this._update_sample_headline_bar();
  },

  /** Update configuration from tab. */
  update()
  {
    //headlines style

    //display favicon
    this._config.headline_shows_feed_icon =
      this._display_favicon.selectedIndex == 0;

    //display enclosure icon
    this._config.headline_shows_enclosure_icon =
      this._display_enclosure.selectedIndex == 0;

    //display banned icon
    this._config.headline_shows_ban_icon =
      this._display_banned.selectedIndex == 0;

    //font
    this._config.headline_font_family = this._font_menu.value;

    //font size
    this._config.headline_font_size =
      this._use_default_font_size.selectedIndex == 0 ?
        "inherit" :
        this._font_size.value + "pt";

    //foreground colour
    this._config.headline_text_colour =
      this._use_foreground_colour.selectedIndex == 0 ?
        "default" : this._foreground_colour.value;

    //recent headline style

    //highlight delay
    this._config.recent_headline_max_age =
      this._document.getElementById("delay1").value;

    //style
    this._config.recent_headline_font_weight =
      this._recent_bold.checked ? "bolder" : "normal";
    this._config.recent_headline_font_style =
      this._recent_italic.checked ? "italic" : "normal";

    //bg colour
    this._config.recent_headline_background_colour =
      this._recent_use_background_colour.selectedIndex == 0 ?
        "inherit" :
        this._recent_background_colour.value;

    //fg colour
    this._config.recent_headline_text_colour =
      this._recent_foreground_colour_mode.selectedIndex == 0 ?
        "auto" :
        this._recent_foreground_colour_mode.selectedIndex == 1 ?
          "sameas" :
          this._recent_foreground_colour.value;
  },

  /** This updates the sample headline bar according to the currently selected
   * options in the screen.
   *
   * This is sometimes called as an event handler.
   */
  _update_sample_headline_bar()
  {
    //---------------------headline style---------------------

    //Icons to display (or not)
    {
      const fav = this._display_favicon.selectedIndex != 0;
      const enc = this._display_enclosure.selectedIndex != 0;
      const ban = this._display_banned.selectedIndex != 0;
      for (let ex = 1; ex <= 4; ex += 1)
      {
        this._document.getElementById("sample.favicon" + ex).collapsed = fav;
        this._document.getElementById("sample.enclosure" + ex).collapsed = enc;
        this._document.getElementById("sample.banned" + ex).collapsed = ban;
      }
    }

    //FIXME what one should do is to construct an object containing the colours
    //and pass to something in inforssheadlinedisplay. clearly this._config
    //needs to return a similar object for inforssheadlinedisplay to use.
    const sample = this._document.getElementById("sample");

    //Font
    sample.style.fontFamily = this._font_menu.value;

    //Font size
    if (this._use_default_font_size.selectedIndex == 0)
    {
      sample.style.fontSize = "inherit";
    }
    else
    {
      sample.style.fontSize = this._font_size.value + "pt";
    }

    const sample_default = this._document.getElementById("sample.default");
    if (this._use_foreground_colour.selectedIndex == 0)
    {
      sample_default.style.color = "inherit";
      this._foreground_colour.disabled = true;
    }
    else
    {
      sample_default.style.color = this._foreground_colour.value;
      this._foreground_colour.disabled = false;
    }

    this._display_recent_style(sample_default.style.color);
  },

  /** Update the recent sample headline style.
   *
   * @param {number} old_text_colour - Colour of old headlines text.
   */
  _display_recent_style(old_text_colour)
  {
    const recent = this._document.getElementById("sample.recent");

    //headline delay doesn't affect the display

    recent.style.fontWeight = this._recent_bold.checked ? "bolder" : "normal";
    recent.style.fontStyle = this._recent_italic.checked ? "italic" : "normal";

    const background = this._recent_use_background_colour.selectedIndex == 0 ?
      "inherit" :
      this._recent_background_colour.value;
    recent.style.backgroundColor = background;
    this._recent_background_colour.disabled =
      this._recent_use_background_colour.selectedIndex == 0;

    const foregroundColor =
      this._recent_foreground_colour_mode.selectedIndex == 0 ?
        "auto" :
        this._recent_foreground_colour_mode.selectedIndex == 1 ?
          old_text_colour :
          this._recent_foreground_colour.value;

    if (foregroundColor == "auto")
    {
      if (background == "inherit")
      {
        recent.style.color = "inherit";
      }
      else
      {
        //Turn the rgb value into HSL and use white or black depending on
        //lightness
        const val = Number("0x" + background.substring(1));
        /*eslint-disable no-bitwise, no-extra-parens*/
        /*jshint bitwise: false*/
        const red = val >> 16;
        const green = (val >> 8) & 0xff;
        const blue = val & 0xff;
        /*jshint bitwise: true*/
        recent.style.color = (red + green + blue) < 3 * 85 ? "white" : "black";
        /*eslint-enable no-bitwise, no-extra-parens*/
      }
      this._recent_foreground_colour.value = recent.style.color;
    }
    else
    {
      recent.style.color = foregroundColor;
    }
    this._recent_foreground_colour.disabled =
      this._recent_foreground_colour_mode.selectedIndex != 2;
  },

});
