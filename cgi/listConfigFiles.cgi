#!/usr/bin/perl -T -w
use strict;
use warnings;
use Fcntl qw(:flock);
use CGI;
my $q = new CGI;
use URI::Escape;
use File::Slurp;


my @foldersjson; # this will hold the content of each folder
opendir(FOLDERS,"../examples/") or die "Couldn't open user directory $!";
while (my $folder = readdir(FOLDERS)) {

	if ($folder !~ /txt$/ and $folder !~ /\./) {

		# read all config files in the current folder with their contents
		my @files;
		my @filenames;
		opendir(FILES,"../examples/".$folder."/") or die "Couldn't open user directory $!";
		while (my $filename = readdir(FILES)) {
			if ($filename =~ /^_conf/) {
				# read the names and contents of all the config files
				push(@filenames, $filename);
				my $content = read_file("../examples/".$folder."/".$filename, binmode => ':utf8' );
				push (@files, $content);
				
			}
		}
		closedir(FILES) or die "Couldn't close user directory $!";
		
		# if config files were found in the current folder, add folder+files to the list
		if (@filenames) {

			my $str1 = '{"foldername": "' . $folder . '", ';
			# if there is a file called "_name.txt" in the folder, its content will be the folder's pretty name
			my $folderprettyname = read_file("../examples/".$folder."/_name.txt", binmode => ':utf8', err_mode => 'quiet' ) || $folder;
			$str1 .= '"folderprettyname": "' . $folderprettyname . '", "files": [';
			
			my @filesjson;
			for (my $i=0; $i<@filenames; $i++) {
				my $str2 = '{"filename": "' . $filenames[$i] . '", "content": ' . $files[$i];
				$str2 .= '}';
				push (@filesjson, $str2); 
			}
			
			$str1 .= join(",", @filesjson) .  "] }";
			push (@foldersjson, $str1);	

		}
	}
}
closedir(FOLDERS) or die "Couldn't close user directory $!";


my $json = "[";
$json .= join(", ", @foldersjson);
$json .=  "]";

print $q->header(-charset=>'utf-8');
#my $callback = $q->url_param("callback") || "";
#print $callback . '(' . $json . ')' ;
print $json;

# done


#$json =~ s/[\n\r\t]/ /g;


