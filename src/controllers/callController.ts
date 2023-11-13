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
          
          console.log(req.body)
          res.send("OK")
        })
    }

    
    public async callProcessor(req: Request, res: Response) {
        const data = req.body;
        
        if (data.data.event_type === "call.hangup") {
          this.currentEvent[data.data.payload.call_control_id] = "call.transcription"
          this.callStates[data.data.payload.call_control_id] = null;
        }
        
      // Check call state before processing any event
      if (this.callStates[data.data.payload.call_control_id] === 'ended' && data.data.event_type !== "call.hangup") {
          console.log(`Ignoring event ${data.data.event_type} for ended call ${data.data.payload.call_control_id}`);
          res.status(409).send("Call has already ended");
          return;
      }
        
        try {
        if(data.data.event_type === "call.playback.started" && this.callStates[data.data.payload.call_control_id] !== 'ended') { 
        //  this.stopTranscription(data.data.payload.call_control_id, this.fromNumber)
          res.send("OK")
        }
        if(data.data.event_type === "call.playback.ended" && this.callStates[data.data.payload.call_control_id] !== 'ended') { 
          // this.startTranscription(data.data.payload.call_control_id, this.fromNumber);
          res.send("OK")
        }
        
        if(data.data.event_type === "call.transcription" && this.callStates[data.data.payload.call_control_id] !== 'ended') { 
          this.currentEvent[data.data.payload.call_control_id] = "call.transcription"
          const promptToSpeak = await this.mainModelPrompt(data.data.payload.call_control_id, data.data.payload.transcription_data.transcript)
          if(promptToSpeak.includes("MENU_REQUESTED")) {
              let triggerToRemove = "MENU_REQUESTED";
              let modifiedString = promptToSpeak.replace(new RegExp(triggerToRemove, 'g'), "");
              this.talk(data.data.payload.call_control_id, modifiedString.trim(), this.fromNumber)
              this.sendTextMessage(this.fromNumber, this.toNumber, "MENU_REQUESTED", data.data.payload.call_control_id)
          } else if(promptToSpeak.includes("PERSON_REQUESTED")){
              let triggerToRemove = "PERSON_REQUESTED";
              let modifiedString = promptToSpeak.replace(new RegExp(triggerToRemove, 'g'), "");
              await this.talk(data.data.payload.call_control_id, modifiedString, this.fromNumber)
              setTimeout(async () => {
                await this.transferCall(data.data.payload.call_control_id, clientData[this.fromNumber].redirectNumber)
              }, 5000)
              
              this.stopAIAssistant(data.data.payload.call_control_id)
              
          } else if(promptToSpeak.includes("RESERVATION_REQUESTED")) {
              let triggerToRemove = "RESERVATION_REQUESTED";
              let modifiedString = promptToSpeak.replace(new RegExp(triggerToRemove, 'g'), "");
              this.talk(data.data.payload.call_control_id, modifiedString, this.fromNumber)
              this.sendTextMessage(this.fromNumber, this.toNumber, "RESERVATION_REQUESTED", data.data.payload.call_control_id)
            } else {
              this.talk(data.data.payload.call_control_id, promptToSpeak, this.fromNumber)
          }
          res.send("OK")
        }
        if(data.data.event_type === "call.initiated" && this.callStates[data.data.payload.call_control_id] !== 'ended') {
          this.currentEvent[data.data.payload.call_control_id] = "call.initiated"
          this.mainLanguageModel = await this.initMainModel(data.data.payload.call_control_id,data.data.payload.to)
          this.answerCall(data.data.payload.call_control_id)
          res.send("OK")
        }

        if (data.data.event_type === 'call.answered' && this.callStates[data.data.payload.call_control_id] !== 'ended') {
          this.currentEvent[data.data.payload.call_control_id] = "call.answered"
          this.fromNumber=data.data.payload.to
          this.toNumber=data.data.payload.from
          const initMessage = this.mainLanguageModel?.choices[0]?.message?.content
          this.talk(data.data.payload.call_control_id, initMessage, this.fromNumber)
          this.startTranscription(data.data.payload.call_control_id, this.fromNumber);
          res.send("OK")
        }

        
        } catch(err) {
          console.log(err)
        }
    }

    
    //answers the phone call
    async answerCall(callControlId: string) {
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
 

async talk(callControllId:string, aiMessage: string, targetNumber:string) {
  try {
    
  if (this.callStates[callControllId] === 'ended') {
    console.log(`Cannot talk, call ${callControllId} has ended.`);
    return;
  }


      const call = new telnyx.Call({call_control_id: callControllId});
      if(this.currentEvent[callControllId] !== "call.answered") {
        
        // const fillerAudio = await this.generateSpeech("uhhhmmmmm", targetNumber)
        // console.log(fillerAudio)
        
        call.playback_start({from_display_name: "Assistant", playback_content:`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`}).catch((err:any)=> console.log(err.message));
      }
      
      
      const base64Audio = await this.generateSpeech(aiMessage, targetNumber)
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
          const telnyxApiKey = process.env.TELNYX_API_KEY; // Using the API Key from .env file
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${telnyxApiKey}`
        };

        const body = JSON.stringify({
            'from': from,
            'to': to,
            'text': type === "RESERVATION_REQUESTED" ? clientData[from].reservationText()  : clientData[from].textMessageText()
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
