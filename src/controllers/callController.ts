require('dotenv').config();
import fetch from 'node-fetch';
import express, { Request, Response, Router, NextFunction } from 'express';
import SpeechService from '../services/speechservice/SpeechService';
import { clientData } from '../clientData';
import WebsocketService from '../services/websocket/WebsocketService'
const telnyx = require('telnyx')(process.env.TELNYX_API_KEY);


class CallController extends SpeechService {
    public basePath = '/calls'
    public router: Router = express.Router();
    public mainLanguageModel: any
    public fromNumber: string;
    public toNumber: string;
    public callStates: any = {};
    public currentEvent: any = {};
    private demoMode:any= false
    private demoRunning:any = false;
    private webSocketService: WebsocketService = new WebsocketService()

    constructor() {
        super();
        this.initRoutes();
        this.fromNumber=""
        this.toNumber=""
        

        
    }

    public initRoutes(): void {
        //receives webhook to start response logic.
        this.router.post(this.basePath + '/call', this.callProcessor.bind(this));
        this.router.get(this.basePath + '/', (res:Response)=> res.send("API online!"));
        this.router.post(this.basePath + '/webhook', (req, res) => { 
          res.send("OK")
        })
    }

    
    public async callProcessor(req: Request, res: Response) {
        const data = req.body;

        console.log(data.data.event_type)
        if (data.data.event_type === "call.hangup") {
          this.currentEvent[data.data.payload.call_control_id] = "call.transcription"
          this.callStates[data.data.payload.call_control_id] = null;
        }
      if(this.demoMode)  {
        
        if(data.data.event_type === "call.initiated") {
          this.answerCall(data.data.payload.call_control_id, {})
        }
       
        if(data.data.event_type === "call.answered" && this.demoRunning === true) {
          this.demoRunning = false
          this.fromNumber=data.data.payload.to
          this.toNumber=data.data.payload.from
          
          // setTimeout(async () => {
          //   await this.talk(data.data.payload.call_control_id, "Hey!!! To place your order, click the link I just texted you. And we close at 9 PM tonight!", this.fromNumber)
          //   this.sendTextMessage(this.fromNumber, this.toNumber, "MENU_REQUESTED", data.data.payload.call_control_id)
            
          // }, 5000)
          // res.send("OK")
         
        }

      
        if(data.data.event_type === "call.hangup") {
          this.demoRunning = true
          res.send("OK")
        }

      } else {

        
      // Check call state before processing any event
      if (this.callStates[data.data.payload.call_control_id] === 'ended' && data.data.event_type !== "call.hangup") {
          console.log(`Ignoring event ${data.data.event_type} for ended call ${data.data.payload.call_control_id}`);
          res.status(409).send("Call has already ended");
          return;
      }
        
        try {

          if(data.data.event_type === "streaming.started"){
            res.send("OK")
          }
          if(data.data.event_type === "streaming.stopped"){
            res.send("OK")
          }
  
          
          
        if(data.data.event_type === "call.playback.started" && this.callStates[data.data.payload.call_control_id] !== 'ended') { 
        this.stopTranscription(data.data.payload.call_control_id, this.fromNumber)
          res.send("OK")
        }
        if(data.data.event_type === "call.playback.ended" && this.callStates[data.data.payload.call_control_id] !== 'ended') { 
          this.startTranscription(data.data.payload.call_control_id, this.fromNumber);
          res.send("OK")
        }
        
        if(data.data.event_type === "call.transcription" && this.callStates[data.data.payload.call_control_id] !== 'ended') { 
          this.currentEvent[data.data.payload.call_control_id] = "call.transcription"
          const readMessage = await this.mainModelPrompt(data.data.payload.call_control_id, data.data.payload.transcription_data.transcript)
          let promptToSpeak =  await readMessage?.read()
          const prompt = promptToSpeak?.message
         
          if(prompt?.includes("MENU_REQUESTED")) {
              let triggerToRemove = "MENU_REQUESTED";
              let modifiedString = prompt?.replace(new RegExp(triggerToRemove, 'g'), "");
              this.talk(data.data.payload.call_control_id, modifiedString.trim())
              this.sendTextMessage(this.fromNumber, this.toNumber, "MENU_REQUESTED", data.data.payload.call_control_id)
          } else if(prompt?.includes("PERSON_REQUESTED")){
              let triggerToRemove = "PERSON_REQUESTED";
              let modifiedString = prompt?.replace(new RegExp(triggerToRemove, 'g'), "");
              await this.talk(data.data.payload.call_control_id, modifiedString)
              setTimeout(async () => {
                await this.transferCall(data.data.payload.call_control_id, clientData[this.fromNumber].redirectNumber)
              }, 5000)
              
              this.stopAIAssistant(data.data.payload.call_control_id)
              
          } else if(prompt?.includes("RESERVATION_REQUESTED")) {
              let triggerToRemove = "RESERVATION_REQUESTED";
              let modifiedString = prompt?.replace(new RegExp(triggerToRemove, 'g'), "");
              this.talk(data.data.payload.call_control_id, modifiedString)
              this.sendTextMessage(this.fromNumber, this.toNumber, "RESERVATION_REQUESTED", data.data.payload.call_control_id)
            } else {
              if(typeof prompt === 'string') {
                this.talk(data.data.payload.call_control_id, prompt)
              }
              
          }
          res.send("OK")
        }
        if(data.data.event_type === "call.initiated" && this.callStates[data.data.payload.call_control_id] !== 'ended') {
          this.currentEvent[data.data.payload.call_control_id] = "call.initiated"
          const startingPrompt = await this.initMainModel(data.data.payload.call_control_id,data.data.payload.to, this.generateSpeech)
          this.answerCall(data.data.payload.call_control_id, startingPrompt)
          res.send("OK")
        }

        if (data.data.event_type === 'call.answered' && this.callStates[data.data.payload.call_control_id] !== 'ended') {
          this.currentEvent[data.data.payload.call_control_id] = "call.answered"
          this.fromNumber=data.data.payload.to
          this.toNumber=data.data.payload.from
          // const initMessage = this.mainLanguageModel?.choices[0]?.message?.content
          // this.talk(data.data.payload.call_control_id, initMessage, this.fromNumber)
          // this.startTranscription(data.data.payload.call_control_id, this.fromNumber);
          res.send("OK")
        }} catch(err) {
          console.log(err)
        } 
      }
    }

    async hangupCall(callControlId:string) {
      console.log("Hanging up call")
      const resp = await fetch(
        `https://api.telnyx.com/v2/calls/${callControlId}/actions/hangup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.TELNYX_API_KEY}`
          },
          body: JSON.stringify({
            
            command_id: '891510ac-f3e4-11e8-af5b-de00688a4901'
          })
        }
      );

      const data = await resp.json();
      console.log(data)
    }

    
    //answers the phone call
    async answerCall(callControlId: string, startingPrompt: any) {
  
      try {
      if (this.callStates[callControlId] === 'ended') {
        console.log(`Cannot talk, call ${callControlId} has ended.`);
        return;
      }
      

        const resp = await fetch(
          `https://api.telnyx.com/v2/calls/${callControlId}/actions/answer`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.TELNYX_API_KEY}`
            },
            body: JSON.stringify({
              from_display_name: "Assistant",
              command_id: '891510ac-f3e4-11e8-af5b-de00688a4901',
              send_silence_when_idle: true
            })
          }
        );
        
        const data = await resp.json();
        this.callStates[callControlId] = data.data.result;
        
        const read = await startingPrompt.read()
        
        this.talk(callControlId, read.message)
          
       
        return data
      } catch(err) {
        console.log(err)
      }  
  }


async startTranscription(callControlId: string, targetNumber:string) {
  try {
    if (this.callStates[callControlId] === 'ended') { 
      return;
    }
  
    
    const call = new telnyx.Call({call_control_id: callControlId});
    const transcription = await call.transcription_start({transcription_tracks:"inbound", language: clientData[targetNumber].language, transcription_engine: "B"}).catch((err:any)=> console.log(err.message));
    
    return transcription
  } catch(err){
    
    return err
 }
}

async stopTranscription(callControlId: string, targetNumber:string) {
  try {
  if (this.callStates[callControlId] === 'ended') {
    console.log(`Cannot talk, call ${callControlId} has ended.`);
    return;
  }
 
  
    const call = new telnyx.Call({call_control_id: callControlId});
    const transcription = await call.transcription_stop({language: clientData[targetNumber].language, transcription_engine: "B", interim_results: true}).catch((error:any)=>console.log(error.message));
    this.talkStream(callControlId)
    return transcription
  } catch(err){
    return err
  }
}
 

async talk(callControllId:string, message:string) {
  try {
    
  if (this.callStates[callControllId] === 'ended') {
    console.log(`Cannot talk, call ${callControllId} has ended.`);
    return;
  }
  

      const call = new telnyx.Call({call_control_id: callControllId});
      if(this.currentEvent[callControllId] !== "call.answered") {
        
        // const fillerAudio = await this.generateSpeech("uhhhmmmmm", targetNumber)
        // console.log(fillerAudio)
        
       
      }
      console.log(message)
      const base64Audio = await this.generateSpeech(message, this.fromNumber)
      call.playback_start({from_display_name: "Assistant", playback_content:base64Audio}).catch((err:any)=> console.log(err.message));
    } catch(err) {
      console.log(err)
    }
  }

    async stopAIAssistant(callControlId:string) {
      try {
      if (this.callStates[callControlId] === 'ended') {
        console.log(`Cannot talk, call ${callControlId} has ended.`);
        return;
    }

      


        const call = new telnyx.Call({ call_control_id: callControlId });
        call.playback_stop().catch((err:any)=> console.log(err.message));
      } catch(err) {
        console.log(err)
      }
    }

      async sendTextMessage(from:string, to:string, type:string, callControlId:string) {
        try {
          const apiUrl = 'https://api.telnyx.com/v2/messages';
          const telnyxApiKey = process.env.TELNYX_API_KEY; // Using the API Key from .env

          function textMessageText(demoMode:boolean) {
            if(demoMode) {
              return "Here is the menu you requested! https://www.phonepal.com"
            } else {
              if(type === "RESERVATION_REQUESTED") {
                return clientData[from].reservationText
              } else {
                return clientData[from].textMessageText()
              }
            }
          }
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${telnyxApiKey}`
        };

        const body = JSON.stringify({
            'from': from,
            'to': to,
            'text': textMessageText(this.demoMode)
        });

        
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: body
            });

            const data = await response.json();
        
            if (response.ok) {
                console.log('Message sent successfully:', data);
            } else {
                console.error('Error sending message:', data);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async transferCall(callControlId:string, destination:string) {
      try {
     
      if (this.callStates[callControlId] === 'ended') {
        console.log(`Cannot talk, call ${callControlId} has ended.`);
        return;
      }
  
      const apiUrl = `https://api.telnyx.com/v2/calls/${callControlId}/actions/transfer`;
      const telnyxApiKey = process.env.TELNYX_API_KEY; // Using the API Key from .env file

      const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${telnyxApiKey}`
      };

      const body = JSON.stringify({
          'to': destination, // The destination number to transfer the call to
      });

      
          const response = await fetch(apiUrl, {
              method: 'POST',
              headers: headers,
              body: body
          });

          const data = await response.json();

          if (response.ok) {
              console.log('Call transferred successfully:', data);
          } else {
              console.error('Error transferring call:', data);
          }
      } catch (error) {
          console.error('Error:', error);
      }
  }

  async talkStream(callControlId:string) {
    
    const resp = await fetch(
      `https://api.telnyx.com/v2/calls/${callControlId}/actions/streaming_start`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.TELNYX_API_KEY}`
        },
        body: JSON.stringify({
          stream_url: 'wss://4e1ed80913dc.ngrok.app/',
          stream_track: 'inbound_track',
          
        })
      }
    );
    
    const data = await resp.json();
    
  
  }


}




export default CallController;
