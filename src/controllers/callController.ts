require('dotenv').config();
import fetch from 'node-fetch';
import express, { Request, Response, Router, NextFunction } from 'express';
import SpeechService from '../services/speechservice/SpeechService';
const telnyx = require('telnyx')(process.env.TELNYX_API_KEY);
class CallController extends SpeechService {
    public basePath = '/calls'
    public router: Router = express.Router();
    public mainLanguageModel: any
    constructor() {
        super();
        this.initRoutes();
    }

    public initRoutes(): void {
        //receives webhook to start response logic.
        this.router.post(this.basePath + '/call', this.callProcessor.bind(this));
    }

    

    public async callProcessor(req: Request, res: Response) {
        const data = req.body;
        try {
       
        if(data.data.event_type === "call.playback.started") { 
          this.stopTranscription(data.data.payload.call_control_id)
          
          res.send("OK")
        }
        if(data.data.event_type === "call.playback.ended") { 
          this.startTranscription(data.data.payload.call_control_id);
          
          res.send("OK")
        }
        if(data.data.event_type === "call.transcription") { 
          
          const promptToSpeak = await this.mainModelPrompt(data.data.payload.transcription_data.transcript)
         
          this.talk(data.data.payload.call_control_id, promptToSpeak)
          res.send("OK")
        }
        if(data.data.event_type === "call.initiated") {
          this.mainLanguageModel = await this.initMainModel()
          this.answerCall(data.data.payload.call_control_id)
         
         res.send("OK")
        }
        if (data.data.event_type === 'call.answered') {
            const initMessage = this.mainLanguageModel?.choices[0]?.message?.content
            this.talk(data.data.payload.call_control_id, initMessage)
            res.send("OK")
        }

        if(data.data.event_type === "call.hangup") {
          // this.stopTranscription(data.data.payload.call_control_id)
          res.send("OK")
         }
        } catch(err) {
          console.log(err)
        }
    }


    async answerCall(callControlId: string) {
      //answers call and inits ws connection

      try {
        const resp = await fetch(
          `https://api.telnyx.com/v2/calls/${callControlId}/actions/answer`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.TELNYX_API_KEY}`
            },
            body: JSON.stringify({
              client_state: 'aGF2ZSBhIG5pY2UgZGF5ID1d',
              from_display_name:"Assistant",
              command_id: '891510ac-f3e4-11e8-af5b-de00688a4901',
              send_silence_when_idle: true
            })
          }
        );
        
        const data = await resp.json();
      
      } catch(err) {
        console.log(err)
      }
      
      
  }


  async startTranscription(callControlId: string) {
    const call = new telnyx.Call({call_control_id: callControlId});
    
    try {
      const transcription = await call.transcription_start({language: "en", transcription_engine: "B", interim_results: true});
      return transcription
    } catch(err){
      throw err;
    }
}

async stopTranscription(callControlId: string) {
  const call = new telnyx.Call({call_control_id: callControlId});
  
  try {
    const transcription = await call.transcription_stop({language: "en", transcription_engine: "B", interim_results: true});
    return transcription
  } catch(err){
    throw err;
  }
}
 

    async talk(callControllId:string, aiMessage: string) {
        const base64Audio = await this.generateSpeech(aiMessage)
        const call = new telnyx.Call({call_control_id: callControllId});
        
        try {
          call.playback_start({ playback_content:base64Audio});
        } catch(err) {
          console.log(err)
        }
      
      }
}

export default CallController;
