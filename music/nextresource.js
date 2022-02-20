const { createAudioResource } = require('@discordjs/voice');
const play_dl = require('play-dl');//유튜브나 spotify 검색과 스트리밍을 도와주느 api 

async function getNextResource(queue,guild,serverQueue){//다음곡을 틀어주는 함수
    serverQueue.songs.shift();//첫번째 배열 노래정보 삭제 
    if(!serverQueue.songs[0]){
         serverQueue.connection.destroy();//voicechannel과의 연결을 끊음
        queue.delete(guild.id);//queue에서 현 voicechannel guild.id를 삭제
      return;
    }
    let stream = await play_dl.stream(serverQueue.songs[0].url);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type
  });
    serverQueue.player.play(resource);
  }

  module.exports = getNextResource;