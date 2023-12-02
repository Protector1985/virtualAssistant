import WebSocket from 'ws'; // or any other preferred WebSocket library

class WebSocketService {
    private webSocket: WebSocket | null;
    
    constructor() {
        this.webSocket = null;
    }

    connect() {
        this.webSocket = new WebSocket('wss://4e1ed80913dc.ngrok.app/');

        this.webSocket.onopen = () => {
            console.log('WebSocket Connection Established');
            // Additional logic on connection open
        };

        this.webSocket.onmessage = (event) => {
            console.log('Message from WebSocket:', event.data);
            // Handle incoming message
        };

        this.webSocket.onerror = (error) => {
            console.error('WebSocket Error:', error);
            // Handle error scenario
        };

        this.webSocket.onclose = () => {
            console.log('WebSocket Connection Closed');
            // Handle connection close
        };
    }

    // Other methods to send messages, close connection, etc.
}

export default WebSocketService ;