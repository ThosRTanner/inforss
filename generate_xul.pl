#!perl
use strict;
use warnings;

# Reads in an xul file and replaces <!-- include xxxx --> with contents of
# file

use File::Basename;
use File::Spec;

sub read_file($$);

sub read_file($$)
{
    my ($file, $indent) = @_;
    open my $handle, '<', $file or die "Failed to open $file: $!\n";
    while (my $line = <$handle>)
    {
        print "$indent$line";
        if ($line =~ m/^(\s+)\<!-- include (.*) --\>/)
        {
            my $new_indent = $1;
            my $name = $2;
            read_file(File::Spec->catfile(dirname($file), $name),
                      "$indent$new_indent");
        }
    }
}

open STDOUT, '>', File::Spec->catfile(qw(source content inforss inforssOption.xul))
    or die "Cannot open output: $!\n";
read_file(File::Spec->catfile(qw(option_window_source inforssOption.xul)), "");
