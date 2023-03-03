import fs from 'fs';

const pathToFolder = ""

fs.readdirSync(pathToFolder).forEach(file => {
    if(file.startsWith('[YT2mp3.info] - ')) {
        let newName = file.replace('[YT2mp3.info] - ', "");
        fs.rename(pathToFolder+"/"+file, newName, (err) => {
            if(err) {
                console.log(err);
            } else {
                console.log('Renamed to --> '+newName);
            }
        })
    }
})