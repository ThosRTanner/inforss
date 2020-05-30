from win32api import GetFileVersionInfo, LOWORD, HIWORD
import os
import re

def get_version_number(filename):
    """ Get the version number of the specified file as a string """
    info = GetFileVersionInfo(filename, "\\")
    ms = info['ProductVersionMS']
    ls = info['ProductVersionLS']
    return ".".join(map(str, (HIWORD(ms), LOWORD(ms), HIWORD(ls), LOWORD(ls))))

def update_rdf(mappings):
    """ Update install.rdf with current version as minimum """
    for prog in mappings:
        mappings[prog] = get_version_number(mappings[prog])
    input_file = "source\\install.rdf"
    output_file = input_file + ".out"
    version = ''
    with open(input_file, encoding="utf-8") as infile:
        with open(output_file, "w", encoding="utf-8") as outfile:
            for line in infile:
                # If it's the version line, use version from changes.md
                #<em:version>2.3.1.0 (pre release)</em:version>
                res = re.search(r'\<em:version\>(.*)\</em:version\>', line)
                if res:
                    # Read the first line of changes.md
                    with open("Changes.md") as changes:
                        changeline = changes.readline().rstrip()
                    # Update the minimum version
                    # Changes for v 2.3.1.0 (pre release)
                    changeline = changeline[16:]
                    line = re.sub(r'>(.*)<', '>' + changeline + '<', line)
                # Look for an ID line
                res = re.search(r'\<em:id\>(.*)\</em:id\>', line)
                if res:
                    if res.group(1) in mappings:
                        # Found one I support - get the version
                        version = mappings[res.group(1)]
                    else:
                        # Not one I support
                        version = ''
                if 'minVersion' in line and version != '':
                    # Update the minimum version
                    line = re.sub(r'>(.*)<', '>' + version + '<', line)
                print(line, end='', file=outfile)
    os.unlink(input_file)
    os.rename(output_file, input_file)

if __name__ == '__main__':
    mappings = {
        "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}":
            "c:\\Program Files\\Pale Moon\\palemoon.exe",
        "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}":
            "C:\\Program Files\\Basilisk\\basilisk.exe"
    }
    update_rdf(mappings)
