const Discord = require("discord.js");//discord 모듈 import 
const config = require("./config.json");//설정파일 파싱 
const play_dl = require('play-dl');//유튜브나 spotify 검색과 스트리밍을 도와주느 api 
const Music = require('./music/music');

const prefix = "!";
const queue = new Map(); // 노래정보를 담을 컬렉션 생성 guild.id와 songinfo를 key 와 value로 넣을 것이다.

const client = new Discord.Client({intents: ["GUILDS","GUILD_VOICE_STATES","GUILD_MESSAGES"]});//객체를 넘김 넘김으로써 해당 권한을 줄거임




client.on('messageCreate', (message) => {//event 리스너 등록 messageCreate는 message가 생성되어있을때 발생하는 이벤트이다.
    // message 작성자가 봇이면 그냥 returnm
    if (message.author.bot) return;
    // message 시작이 prefix가 아니면 return
    if (!message.content.startsWith(prefix)) return;
    const serverQueue = queue.get(message.guild.id);//queue에 message.guild.id가 키로 있다면 리턴 없으면 undefined 초기에는 없을거다.
    //문서상 guild는 채널과 사용자의 독립된 모음이라고 한다. ui에서는 이것을 서버라고 한다고 한다. 디스코드 서버를 말하며 guild.id는 디스코드 서버의 id이다.
    //서버에 초대됨가 동시에 서버의 guild.id를 알수있으며 이를 이용해 맵으로 넣어놨다. 해당함수
    const commandBody = message.content.slice(prefix.length);//preifx의 length만큼 자름 
    const args = commandBody.split(' ');//띄어쓰기 단위로 나눠서 배열로 반환
    const command = args.shift().toLowerCase();//shift 배열의 첫번째요소를 잘라서 return함 당연히 현 배열은 첫번째요소가 없음 toLowerCase로 인해 반환할때는 소문자로 반환
    
    if (command === "ping") {
        message.reply(`pong!`);
    } 

    if (command ==="play") {
        Music.execute(queue,message, serverQueue);
        return;
    } else if (command ==="skip") {
        Music.skip(queue,message, serverQueue);
        return;
    } else if (command ==="stop") {
        Music.stop(message, serverQueue);
        return;
    } else if (command ==="resume") {
        Music.resume(message, serverQueue);
      return;
  } else {
        message.channel.send("You need to enter a valid command!");
    }
});
 
  
 
  
  
  

client.login(config.TEST_TOKEN);