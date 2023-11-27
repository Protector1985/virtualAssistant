import mongoose, {Schema, Document, Model} from "mongoose"



class MongoService {
    private clientData?: Schema;
    private model?:Model<any>;

    constructor() {
        this.clientData= new Schema({
            clientPhone: {type: String, required: true, unique:true },
            name: {type: String, required: true},
            hours: {type:String, required: true},
            location: {type:String, required: true},
            address: {type: String, required: true},
            businessType: {type: String, required: true},
            orderUrl: {type:String, required: true},
            redirectNumber: {type:String, required: true},
            reservationUrl: {type:String, required: true},
            language: {type:String, required: true},
            turboModel: {type: Boolean, required: true},
            conversationHistory: {type: Map, required: false, default:[]},
            systemPrompt: {type: String, required: true},
            textMessageText: {type: String, required:true},
            reservationText: {type:String, required:true},
            pinLocationText: {type:String, required: true}
        })

        if (mongoose.models.Client) {
            this.model = mongoose.models.Client as Model<any>;
        } else {
            this.model = mongoose.model<any>('Client', this.clientData);
        }

    }
        
        
    private async addConversationHistory(phoneNumber: string, conversationData: {}) {
        const client = await this.findClient(phoneNumber);
        if (client && client.length > 0) {
            // Assuming client[0] is the document you want to update
            let clientDoc = client[0];
    
            // Update the conversationHistory Map
            // Convert conversationData to a Map if it's not already one
            const newConversationData = new Map(Object.entries(conversationData));
    
            // Merge the new data with the existing conversationHistory
            newConversationData.forEach((value, key) => {
                clientDoc.conversationHistory.set(key, value);
            });
    
            // Save the updated document
            await clientDoc.save();
        } else {
            // Handle the case where the client is not found
            console.error('Client not found for phone number:', phoneNumber);
        }
    }
    

    async findClient(clientPhone:String):Promise<any[]> {
        const client = await this.model!.find({clientPhone});
        return client
    }

    async addClient(clientData:any) {
        try {
            const newClient = new this.model!({
                clientPhone: clientData.clientPhone,
                name: clientData.name,
                hours: clientData.hours,
                location: clientData.location,
                address: clientData.address,
                businessType: clientData.businessType,
                orderUrl: clientData.orderUrl,
                redirectNumber: clientData.redirectNumber,
                reservationUrl: clientData.reservationUrl,
                language: clientData.language,
                turboModel: clientData.turboModel,
                systemPrompt: clientData.systemPrompt,
                textMessageText: clientData.textMessageText,
                reservationText: clientData.reservationText,
                pinLocationText: clientData.pinLocationText

            });

            await newClient.save();
            return 'Client added successfully'
            
        } catch (error) {
            console.error('Error adding client:', error);
            throw error;
        }
    }

    async connectMongoDb(): Promise<void> {
        try {
            const dbURI = process.env.DB

            if(!dbURI) {
                throw new Error("DB URI has to be provided")
            }

            mongoose.connection.on('connected', () => {
                console.log('----DATABASE CONNECTION SUCCESSFUL-----');
                
            });

            mongoose.connection.on('disconnected', () => {
                console.error('Database connection lost');
            });
            mongoose.connection.on("error", () =>{
                console.error("Error connecting to db")
            })
            
            await mongoose.connect(process.env.DB as any)

            

        } catch(error) {
            console.log(error)
        }
    }
}

export default MongoService;