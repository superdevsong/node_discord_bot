const play_dl = require('play-dl');//유튜브나 spotify 검색과 스트리밍을 도와주느 api 
const { joinVoiceChannel ,createAudioPlayer,createAudioResource,AudioPlayerStatus } = require('@discordjs/voice');
const getNextResource = require('./nextresource');

async function execute(queue,message, serverQueue) {//음악실행 함수 
    let title;
    const args = message.content.slice(6);

    const voiceChannel = message.member.voice.channel;//voice channel context 
    if (!voiceChannel)
      return message.channel.send(
        "You need to be in a voice channel to play music!"// voicechannel 존재여부 
      );
    const permissions = voiceChannel.permissionsFor(message.client.user);//permission확인 
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
      return message.channel.send(
        "I need the permissions to join and speak in your voice channel!"
      );
    }
    const songURL = await play_dl.yt_validate(args);//video url이 맞는지 검증  
    let video = undefined;
    let songInfo = undefined;
    if(songURL=="search"){
      video = await play_dl.search(args, {
        limit: 1
    });//유튜브 검색후에 video 정보 배열 넘김 
      songInfo = await play_dl.video_info(video[0].url);//video url 검색 
    } else {
      songInfo = await play_dl.video_info(args);
    }
    
    const song = { //노래 정보 객체
          title: songInfo.video_details.title,
          url: songInfo.video_details.url,
     };
  
    if (!serverQueue) {//처음에는 정의 되어 있지않으니 노래 구조체 
      const queueContruct = {
        textChannel: message.channel, //메시지 채널 
        voiceChannel: voiceChannel, //보이스채널 
        connection: null, //서버와 연결 
        songs: [], // 들어있는 노래들 
        volume: 5,//볼륨
        playing: true, //륨레이중 
        player: null //오디오 플레이어  안정해져있음 
      };
  
      queue.set(message.guild.id, queueContruct); //guild id 로 노래 구조체를 큐에 넣음 
  
      queueContruct.songs.push(song);//현재 추가한 노래를 배열에 추가함 
  
      try {
        var connection = joinVoiceChannel({//보이스 채널과의 커넥션을 정의함 이것으로 오디오플레이어를 연결할거임 
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        queueContruct.connection = connection; // 보이스 채널 연결성을 노래 구조체에 대입 
        play(queue,message.guild, queueContruct.songs[0]); // 노래재생 
      } catch (err) {
        console.log(err);
        queue.delete(message.guild.id);
        return message.channel.send(err);
      }
    } else {
      serverQueue.songs.push(song);
      return message.channel.send(`${song.title} has been added to the queue!`);
    }
  }

  async function play(queue,guild, song) { //음악 재생 
    const player = createAudioPlayer();//음악을 틀어줄 플레이어 정의 
    const serverQueue = queue.get(guild.id);//노래를튼 디스코드 서버의 정보로 해당 디스코드의 노래구조체를 가져옴 
    serverQueue.player = player;//현 서버에 노래를 틀어줄 플레이어를 노래 구조체에 넣어줌 
    if (!song) {//만약 노래가 비어있다면 보이스채널 떠남 
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
      return;
    }
    let stream = await play_dl.stream(song.url); //노래를 다운 받아옴 
    const resource = createAudioResource(stream.stream, {// 현 스트림을 바탕으로 resource 생성
      inputType: stream.type
  });
    
    player.play(resource);// 현 리소스로 플레이어 노래 재생
    player.on(AudioPlayerStatus.Idle, () => {// 만약 노래 끝나면 다음노래 재생 
        if(subscription)//서버와 연결성이 끊기면 subsciption은 null이된다.
        getNextResource(queue,guild,serverQueue);
    });
    player.on('error', error => { //에러 발생시 에러로그 남기고  나가기
      console.error(`Error2: ${error.message} \nError3:${error} `);
      serverQueue.connection.destroy();//voicechannel과의 연결을 끊음
      queue.delete(guild.id);//queue에서 현 voicechannel guild.id를 삭제
    });
    
    const subscription = serverQueue.connection
      .subscribe(player); // 현 보이스 채널의 연결성을 통해 노래재생중인 플레이어를 들여보낸다. 
      //참고로 이때 플레이어는 디코봇 자체보다는 디코봇이 만든 음악재생 객체이며
      //서버에 들어와있는 디코봇을 통해 음악을 재생한다 디코봇은 프로그램이며 서버에 들어와있는것은 그냥 분신이라고 보면 된다.
      
    serverQueue.textChannel.send(`Start playing: **${song.title}**`);

  }
  module.exports = execute;