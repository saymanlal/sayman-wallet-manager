class SaymanWallet {
    constructor(privateKey = null) {
      this.privateKey = privateKey;
      this.publicKey = null;
      this.address = null;
      this.ec = new elliptic.ec('secp256k1');
    }
  
    async initialize() {
      if (this.privateKey) {
        const keyPair = this.ec.keyFromPrivate(this.privateKey, 'hex');
        this.publicKey = keyPair.getPublic('hex');
      } else {
        const keyPair = this.ec.genKeyPair();
        this.privateKey = keyPair.getPrivate('hex');
        this.publicKey = keyPair.getPublic('hex');
      }
  
      const encoder = new TextEncoder();
      const data = encoder.encode(this.publicKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      this.address = hashHex.substring(0, 40);
  
      return this;
    }
  
    async signTransaction(txData) {
      const keyPair = this.ec.keyFromPrivate(this.privateKey, 'hex');
      const dataString = JSON.stringify(txData);
      
      const encoder = new TextEncoder();
      const data = encoder.encode(dataString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
      const signature = keyPair.sign(hash);
      return signature.toDER('hex');
    }
  
    export() {
      return {
        privateKey: this.privateKey,
        publicKey: this.publicKey,
        address: this.address
      };
    }
  }