#! /bin/bash
#
# image2heic
# Converts images to a 3508xH / Wx3508 size HEIC file
#
# Author: Álvaro Galisteo (https://alvaro.ga)
# Copyright 2020 - GPLv3

file=$1

res=$(identify -format "%[fx:w] %[fx:h]" "$file")
width=$(echo $res | awk '{print $1}')
height=$(echo $res | awk '{print $2}')

echo "Converting ${file}"
if [[ $width -gt $height ]]; then
    convert "$file" -resize "400" "$file"
    #echo "Bigger width"
else
    convert "$file" -resize "x400" "$file"
    #echo "Bigger height"
fi