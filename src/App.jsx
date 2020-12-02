import './App.css';
import Amplify, { API, graphqlOperation, Storage } from 'aws-amplify';
import awsconfig from './aws-exports';
import { AmplifySignOut, withAuthenticator } from '@aws-amplify/ui-react';
import React, { useState, useEffect } from 'react';
import { listSongs } from './graphql/queries';
import { updateSong } from './graphql/mutations';

import { Paper, IconButton } from '@material-ui/core'
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';
import ThumbUpIcon from '@material-ui/icons/ThumbUp';
import ReactPlayer from 'react-player';

Amplify.configure(awsconfig);

function App() {
  const [songs, setSongs] = useState([]);
  const [songPlaying, setSongPlaying] = useState('')
  const [audioURL, setAudioURL] = useState('')

  useEffect(() => {
    fetchSongs()
  },[])
  // empty array to break infinite loop

  const toggleSong = async idx => {
    if (songPlaying === idx) {
      setSongPlaying('');
      return;
    }

    const songFilePath = songs[idx].filePath;
    try {
      const fileAccessURL = await Storage.get(songFilePath, { expires: 60 });
      console.log('access url', fileAccessURL);
      setSongPlaying(idx);
      setAudioURL(fileAccessURL);
      return;
    } catch (error) {
      console.error('error accessing the file from s3', error);
      setAudioURL('');
      setSongPlaying('');
    }
};

  const fetchSongs = async () => {
    try {
      const songData = await API.graphql(graphqlOperation(listSongs))
      const songList = songData.data.listSongs.items;
      console.log('song list', songList)
      setSongs(songList)
    } catch (error) {
      console.log('error on fetching songs', error);
    }
  }

  const addLike = async (idx) => {
    try {
        const song = songs[idx];
        song.like = song.like + 1;
        delete song.createdAt;
        delete song.updatedAt;

        const songData = await API.graphql(graphqlOperation(updateSong, { input: song }));
        const songList = [...songs];
        songList[idx] = songData.data.updateSong;
        setSongs(songList);
    } catch (error) {
        console.log('error on adding Like to song', error);
    }
};

  return (
    <div className="App">
      <header className="App-header">
        <h2>Maestro</h2>
        <AmplifySignOut />
      </header>
      <div className="songList">
        {songs.map((song, idx) => {
          return (
            <Paper variant="outlined" elevation={2} key={`song${idx}`}>  
              <div className="songCard">
                <IconButton aria-label="play" onClick={()=> toggleSong(idx)}>
                { songPlaying === idx? <PauseIcon/> : <PlayArrowIcon /> }
                </IconButton>
                <div>
                  <div className="songTitle">{song.title}</div>
                  <div className="songOwner">{song.owner}</div>
                </div>
                <div>
                  <IconButton aria-label="like" onClick={() => {addLike(idx)}}>
                    <ThumbUpIcon />
                  </IconButton>
                  {song.like}
                </div>
                <div className="songDescription">{song.description}</div>
              </div>
              {
                songPlaying === idx ? (
                  <div className="ourAudioPlayer">
                    <ReactPlayer 
                    url={audioURL}
                    controls
                    playing
                    // controls and playing is set to true, so that controls appear and it starts playing as soon as it loads
                    height="50px"
                    onPause={() => toggleSong(idx)}
                    />
                  </div>
                ) : null
              }
            </Paper>
          )}
        )}
      </div>
    </div>
  );
}

export default withAuthenticator(App);
