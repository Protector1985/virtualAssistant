require('dotenv').config();
import fetch from 'node-fetch';
import express, { Request, Response, Router, NextFunction } from 'express';
import SpeechService from '../services/speechservice/SpeechService';
import { clientData } from '../clientData';
import WebsocketService from '../services/websocket/WebsocketService'
import {audioFiller} from './assets/audioFiller'
const telnyx = require('telnyx')(process.env.TELNYX_API_KEY);


class CallController extends SpeechService {
    public basePath = '/calls'
    public router: Router = express.Router();
    public fromNumber:any = {};
    public toNumber:any = {};
    public callStates: any = {};
    public currentEvent: any = {};
    private demoMode:any= false
    private demoRunning:any = false;
    private transcribingActive:any = {}
    // private webSocketService: WebsocketService = new WebsocketService()

    constructor() {
        super();
        this.initRoutes();
        
        

        
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
       
        //cleans up the state!
        if (data.data.event_type === "call.hangup") {
          delete this.toNumber[data.data.payload.call_control_id]
          delete this.fromNumber[data.data.payload.call_control_id]
          delete this.transcribingActive[data.data.payload.call_control_id]
          delete this.currentEvent[data.data.payload.call_control_id]
          delete this.callStates[data.data.payload.call_control_id]
        }
      
        if(this.demoMode)  {
        
        if(data.data.event_type === "call.initiated") {
          this.fromNumber[data.data.payload.call_control_id] = data.data.payload.to
          this.toNumber[data.data.payload.call_control_id] = data.data.payload.from
          this.answerCall(data.data.payload.call_control_id, {})
        }
       
        if(data.data.event_type === "call.answered" && this.demoRunning === true) {
          
          this.demoRunning = false
          // this.fromNumber[data.data.payload.call_control_id] = data.data.payload.to
          // this.toNumber[data.data.payload.call_control_id] = data.data.payload.from
          
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
          this.clearConversationHistory(data.data.payload.call_control_id)
          return;
      }
        
        try {

          if(data.data.event_type === "streaming.started"){
            this.currentEvent[data.data.payload.call_control_id] = "streaming.started"
            res.send("OK")
          }

          if(data.data.event_type === "streaming.failed"){
            this.currentEvent[data.data.payload.call_control_id] = "streaming.failed"
            res.send("OK")
          }

          if(data.data.event_type === "streaming.stopped"){
            this.currentEvent[data.data.payload.call_control_id] = "streaming.stopped"
            res.send("OK")
          }
  
          
          
        if(data.data.event_type === "call.playback.started" && this.callStates[data.data.payload.call_control_id] !== 'ended') { 
          this.currentEvent[data.data.payload.call_control_id] = "call.playback.ended"
          this.stopTranscription(data.data.payload.call_control_id, this.fromNumber[data.data.payload.call_control_id])
          res.send("OK")
        }

        if(data.data.event_type === "call.playback.ended" && this.callStates[data.data.payload.call_control_id] !== 'ended') {  
          this.currentEvent[data.data.payload.call_control_id] = "call.playback.ended"
          this.startTranscription(data.data.payload.call_control_id, this.fromNumber[data.data.payload.call_control_id]);
          res.send("OK")
        }
        
        if(data.data.event_type === "call.transcription" && this.callStates[data.data.payload.call_control_id] !== 'ended') { 
          this.currentEvent[data.data.payload.call_control_id] = "call.transcription"
          const call = new telnyx.Call({call_control_id: data.data.payload.call_control_id});
          call.playback_start({from_display_name: "Assistant", playback_content:audioFiller[Math.floor(Math.random() * audioFiller.length)]}).catch((err:any)=> console.log(err.message));
          
          
          const readMessage = await this.mainModelPrompt(data.data.payload.call_control_id, data.data.payload.transcription_data.transcript)
          let promptToSpeak =  await readMessage?.read()
          const prompt = promptToSpeak?.message
         
          if(prompt?.includes("MENU_REQUESTED")) {
              let triggerToRemove = "MENU_REQUESTED";
              let modifiedString = prompt?.replace(new RegExp(triggerToRemove, 'g'), "");
              this.talk(data.data.payload.call_control_id, modifiedString.trim())
              this.sendTextMessage(this.fromNumber[data.data.payload.call_control_id], this.toNumber[data.data.payload.call_control_id], "MENU_REQUESTED", data.data.payload.call_control_id)
          } else if(prompt?.includes("PERSON_REQUESTED")){
              let triggerToRemove = "PERSON_REQUESTED";
              let modifiedString = prompt?.replace(new RegExp(triggerToRemove, 'g'), "");
              await this.talk(data.data.payload.call_control_id, modifiedString)
              setTimeout(async () => {
                await this.transferCall(data.data.payload.call_control_id, clientData[this.fromNumber[data.data.payload.call_control_id]].redirectNumber)
              }, 5000)
              
              this.stopAIAssistant(data.data.payload.call_control_id)
              
          } else if(prompt?.includes("RESERVATION_REQUESTED")) {
              let triggerToRemove = "RESERVATION_REQUESTED";
              let modifiedString = prompt?.replace(new RegExp(triggerToRemove, 'g'), "");
              this.talk(data.data.payload.call_control_id, modifiedString)
              this.sendTextMessage(this.fromNumber[data.data.payload.call_control_id], this.toNumber[data.data.payload.call_control_id], "RESERVATION_REQUESTED", data.data.payload.call_control_id)
            } else {
              if(typeof prompt === 'string') {
                this.talk(data.data.payload.call_control_id, prompt)
              }
              
          }
          res.send("OK")
        }
        if(data.data.event_type === "call.initiated" && this.callStates[data.data.payload.call_control_id] !== 'ended') {
          this.fromNumber[data.data.payload.call_control_id] = data.data.payload.to
          this.toNumber[data.data.payload.call_control_id] = data.data.payload.from
          this.currentEvent[data.data.payload.call_control_id] = "call.initiated"
          const startingPrompt = await this.initMainModel(data.data.payload.call_control_id,data.data.payload.to, this.generateSpeech)
          this.answerCall(data.data.payload.call_control_id, startingPrompt)
          res.send("OK")
        }

        if (data.data.event_type === 'call.answered' && this.callStates[data.data.payload.call_control_id] !== 'ended') {
          this.currentEvent[data.data.payload.call_control_id] = "call.answered"
          this.noiseSurpression(data.data.payload.call_control_id) 
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
      return data
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
  
    let transcription
    const call = new telnyx.Call({call_control_id: callControlId});
    
    if(!this.transcribingActive[callControlId]) {
      transcription = await call.transcription_start({transcription_tracks:"inbound", language: clientData[targetNumber].language, transcription_engine: "B"}).catch((err:any)=> console.log(err.message));
    }
    
    
    if(transcription.data.result === "ok") {
      this.transcribingActive[callControlId] = true
    }
    

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
    let transcription
    const call = new telnyx.Call({call_control_id: callControlId});  
    

    if(this.transcribingActive) {
      transcription = await call.transcription_stop({language: clientData[targetNumber].language, transcription_engine: "B", interim_results: true}).catch((error:any)=>console.log(error.message));
    }
    
    //stops transcription, starts playback
    if(transcription.data.result === "ok") {
      this.transcribingActive[callControlId] = false;
      this.talkStream(callControlId)
    }
    
   
    
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
         
      
      const base64Audio = await this.generateSpeech(message, this.fromNumber[callControllId])
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

  async noiseSurpression(callControlId:string) {
    try {
    console.log("Noise surpression online")
    const resp = await fetch(
      `https://api.telnyx.com/v2/calls/${callControlId}/actions/suppression_start`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.TELNYX_API_KEY}`
        },
        body: JSON.stringify({
          client_state: 'aGF2ZSBhIG5pY2UgZGF5ID1d',
          command_id: '891510ac-f3e4-11e8-af5b-de00688a4901',
          direction: 'both'
        })
      }
    );
    
    const data = await resp.json();
    console.log(data);

    } catch(err) {
      console.log(err)
    }
    

  }

 


}




export default CallController;
