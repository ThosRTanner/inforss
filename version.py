import json
import re
import subprocess

from pathlib import Path

def update_rdf():
    """ Update install.rdf with current version as minimum """
    with open("supported_versions.json") as versions:
        mappings = json.load(versions)
    # Waterfox and seamonkey both require all the localisation info in each
    # section, even when it's the same as the default.
    # Both seem pretty dead to me, so support may just be dropped.
    # Maybe we should generate one xpi for palemoon based browsers and one for
    # others, but that remains to be seen.
    generating_for_seamonkey = any(
        "seamonkey" in prog["program"] for prog in mappings
    )
    input_file = "template_install.rdf"
    output_file = f"source\\install.rdf"
    version = ''
    name = None
    magic_lines = []

    # This is the official semver regex, but I've broken it down to make it
    # easier to read and adjusted the captures for powershell.
    ver_digits = r"0|[1-9]\d*"
    pre_rel_match = r"(?:" + ver_digits + r"|\d*[a-zA-Z-][0-9a-zA-Z-]*)"
    semver_regex = (
        '^' +
        r"(?P<major>" + ver_digits + r")" +
        r"\.(?P<minor>" + ver_digits + r")"
        r"\.(?P<patch>" + ver_digits + r")" +
        # pre-release
        r"(?:-(?P<prerelease>" + pre_rel_match + r"(?:\." + pre_rel_match +
            r")*))?" +
        # build meta
        r"(?:\+(?P<buildmetadata>[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?" +
        '$'
    )
    with open(output_file, "w", encoding="utf-8") as outfile:
        with open(input_file, encoding="utf-8") as infile:
            for line in infile:
                # Insert versions before the inforss title
                if "<!-- Supported versions -->" in line:
                    # OK, let's work out how we are going to set up the version.

                    # We're going to use Semantic versioning (see
                    # https://semver.org/ )

                    # This means (roughly) that all versions are of the form

                    # x.y.z
                    # x.y.z+<build>
                    # x.y.z-<prerelease>
                    # x.y.z-<prerelease>+<build>

                    # We basically ignore the prerelease and build parts of the
                    # tag, and go back to the previous x.y.z tag for the major,
                    # minor and patch versions.
                    #
                    # We then use that and the number of commits since that tag
                    # for the 4th field in the version number.

                    # Find a tag to base ourselves on.
                    intended_ver = subprocess.check_output(
                        ["git", "describe", "--tag", "--always", "--dirty"],
                        text=True
                    ).rstrip()

                    # To find the release, list all the tags, and find the
                    # latest one that is a non-pre-release tag
                    found = False
                    tags = subprocess.check_output(
                            ["git", "tag", "-l", "--sort=-version:refname"],
                            text=True
                        ).splitlines()
                    for tag in tags:
                        if (match := re.match(semver_regex, tag)):
                            matches = match.groupdict()
                            if matches["prerelease"] is None:
                                found = True
                                break

                    commits = int(
                        subprocess.check_output(
                            ["git", "rev-list", "--count", "head"],
                            text=True
                        ).rstrip()
                    )

                    if found:
                        major = matches["major"]
                        minor = matches["minor"]
                        patch = matches["patch"]
                        commits -= int(
                            subprocess.check_output(
                                ["git", "rev-list", "--count", tag],
                                text=True
                            ).rstrip()
                        )
                    else:
                        # This doesn't have a tag. Behave as though we'd been
                        # created at 0.0.0 and just count the commits in our
                        # tree.
                        tag = "0.0.0"
                        major = 0
                        minor = 0
                        patch = 0

                    version = tag
                    if commits != 0:
                        version += f".{commits}"
                    if intended_ver.endswith("-dirty"):
                        version += "-dirty"
                    print("Setting to version " + version)
                    print(
                        f"    <em:version>{version}</em:version>",
                        file=outfile,
                    )

                    for prog in mappings:
                        print(
                            f"""
    <!-- {Path(prog["program"]).parent.name} -->
    <em:targetApplication>
      <Description>
        <em:id>{prog["id"]}</em:id>
        <em:minVersion>{prog["min"]}</em:minVersion>
        <em:maxVersion>{prog["max"]}</em:maxVersion>
      </Description>
    </em:targetApplication>
"""[:-1],
                            file=outfile,
                        )
                    continue

                # This is required for seamonkey or waterfox.
                if generating_for_seamonkey:
                    if '<em:name>' in line:
                        name = line
                    for magic in (
                        'contributor',
                        'creator',
                        'developer',
                        'translator'
                    ):
                        if f"<em:{magic}>" in line:
                            magic_lines += [ line ]

                    if "</Description>" in line and name is not None:
                       print(" " * 4 + name, end='', file=outfile)
                       for magic in magic_lines:
                           print(" " * 4 + magic, end='', file=outfile)

                print(line, end='', file=outfile)

if __name__ == '__main__':
    update_rdf()
