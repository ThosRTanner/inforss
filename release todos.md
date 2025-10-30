# IMPORTANT Before release

* Check the xml config version number matches code before release (inforss_Config.jsm line 1390 ish)
* Update Changes.md with release number
* Run `python generate_supported_versions.py` to ensure appropriate versions are tagged.

To test the .xpi gets generated correctly, you can:

1. Run `cd option_window_source; perl generate_xul.pl` to ensure the XUL file is up to date (which you should have been doing if you've been editting things in there!)
1. Run `python version.py` to update install.rdf
1. Run `create_xpi` to create xpi file
