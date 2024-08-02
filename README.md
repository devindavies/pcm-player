PCM Player
-----------
A minimalist javascript audio player for PCM streaming data for the browsers.

**How to use?**

    const player = new PCMPlayer(option);

Available options are:

*encoding* - possible values 8bitInt / 16bitInt / 32bitInt / 32bitFloat default: 16bitInt

*channels* - no of channels in PCM data

*sampleRate* - sample rate of the PCM data

*flushingTime* - flushing interval of PCM data to be played in milisecond. Default 1000ms 

Decoder fire an event *decode* whenever it completes decoding. Usually it decodes several opus packet at a time for better performance although it need to be provided single opus packet into *decode* method.

**Complete example:**

    var player = new PCMPlayer({
        encoding: '16bitInt',
        channels: 2,
        sampleRate: 8000,
        flushingTime: 2000
    });
    
    // Now feed PCM data into player getting from websocket or ajax whatever the transport you are using.
    player.feed(pcm_data);

**Available Methods**

| Name        | Parameter           | Remark  |
| ------------- |:-------------:| -----:|
| feed      |  raw PCM data | Usually get from ajax or websocket
| volume      | decimal value 0 to 1      |  For controlling volume of the player  |
| destroy | -      |    Destroy the player instance and release the resources |
  

**How to run example?**

An example with simple node server script is available that include some raw pcm data that will be served by websocket and at the client end, it will be played through PCM player. For running the example, first run the node server by following command:
(I am assuming you are on project directory i.e pcm-player)

*cd example/server*

*node server.js*

then run following command

*npx serve*

Finally visit example page using URL  http://localhost:3000/example OR URL suggested by serve

