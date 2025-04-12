/**
 * PremiumService - Handles Premium feature verification through Bitcoin payments
 * 
 * This service manages the premium status of users by:
 * 1. Generating a deterministic Bitcoin address based on the user's email
 * 2. Verifying if this address has received payment
 * 3. Storing and managing premium status
 */

import * as bitcoin from 'bitcoinjs-lib';
// Direct import of BIP32 (the library exports a function as default export)
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
// Create bip32 instance
const bip32 = BIP32Factory(ecc);
import * as bs58check from 'bs58check';
import * as crypto from 'crypto';
import Store from 'electron-store';
import { net } from 'electron';

export interface PremiumStatus {
  isPremium: boolean;
  email?: string;
  expiresAt?: Date;
  bitcoinAddress?: string;
  paymentVerified?: boolean;
  paymentAmount?: number;
  premiumPriceUSD?: number;
  premiumPriceBTC?: number;
  btcPriceUSD?: number;
  lastChecked?: Date;
  isFallback?: boolean;
  isEmergencyFallback?: boolean;
  hasExpired?: boolean;
  partialPayment?: boolean;  // Indicates payment was less than required but was accepted due to time passed
}

interface MempoolSpaceAddressResponse {
  address: string;
  chain_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
  mempool_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
}

interface MempoolSpacePriceResponse {
  time: number;
  USD: number;
  EUR: number;
  GBP: number;
  CAD: number;
  CHF: number;
  AUD: number;
  JPY: number;
}

export class PremiumService {
  private store: Store<any>; // Using any type to avoid TypeScript errors with electron-store
  private xpub: string;
  private network: bitcoin.Network;
  private minimumPaymentUSD: number = 39; // $39 USD for premium (annual subscription)
  private minimumPaymentSats: number = 100000; // Default: 0.001 BTC (will be updated dynamically)
  private btcPriceUSD: number = 0; // Will be populated when fetched
  
  /**
   * Initialize Premium Service with the XPUB key used for deriving addresses
   * 
   * @param xpub The extended public key for generating Bitcoin addresses
   */
  constructor(xpub?: string) {
    this.store = new Store({
      name: 'premium-config',
      defaults: {
        premium: {
          isPremium: false,
          lastChecked: null,
          premiumPriceUSD: this.minimumPaymentUSD
        }
      }
    });
    
    // For demo purposes, we'll use bitcoin mainnet
    this.network = bitcoin.networks.bitcoin;
    
    // Use the provided XPUB or fall back to the compiled-in default
    // IMPORTANT: This is a demo key, never use this in production!
    // Using a valid mainnet xpub for demo purposes
    const defaultXpub = 'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz';
    this.xpub = xpub || process.env.PREMIUM_XPUB || defaultXpub;
    
    console.log(`[PremiumService] Initialized with XPUB: ${this.xpub.substring(0, 10)}...`);
    
    // Fetch Bitcoin price when service starts
    this.fetchBitcoinPrice().then((price) => {
      if (price > 0) {
        this.btcPriceUSD = price;
        
        // Update the minimum payment amount based on price
        // Convert USD price to BTC with 8 decimal places precision
        const btcAmount = this.minimumPaymentUSD / price;
        
        // Convert to satoshis (1 BTC = 100,000,000 satoshis)
        this.minimumPaymentSats = Math.ceil(btcAmount * 100000000);
        
        // Store the updated pricing in the status
        const status = this.getPremiumStatus();
        this.store.set('premium', {
          ...status,
          premiumPriceUSD: this.minimumPaymentUSD,
          premiumPriceBTC: btcAmount,
          btcPriceUSD: price
        });
        
        console.log(`[PremiumService] Updated price: $${this.minimumPaymentUSD} USD = ${btcAmount.toFixed(8)} BTC (${this.minimumPaymentSats} sats) at rate $${price}`);
      }
    }).catch((error) => {
      console.error('[PremiumService] Error fetching Bitcoin price:', error);
    });
  }
  
  /**
   * Get current premium status
   */
  public getPremiumStatus(): PremiumStatus {
    return this.store.get('premium') as PremiumStatus;
  }

  /**
   * Derive a Bitcoin address deterministically from a user's email
   * 
   * @param email The user's email address
   * @returns Bitcoin address for premium payment
   */
  public getBitcoinAddressForEmail(email: string): string {
    try {
      // Normalize the email (lowercase)
      const normalizedEmail = email.trim().toLowerCase();
      
      // Create a deterministic index from the email
      const hash = crypto.createHash('sha256').update(normalizedEmail).digest();
      
      // Use first 4 bytes of hash as the index number
      // Use a much smaller range for index to avoid potential issues
      const index = hash.readUInt32LE(0) % 1000; // Ensure it's positive and within a safe range
      
      console.log(`[PremiumService] Generating address for ${normalizedEmail} with index ${index}`);
      
      // Verify xpub is valid before proceeding
      if (!this.xpub || this.xpub.length < 10) {
        throw new Error('Invalid or missing xpub');
      }
      
      try {
        // Derive the HD node from xpub
        const node = bip32.fromBase58(this.xpub, this.network);
        
        // Derive child key at a known-good index path (m/0/index)
        const child = node.derive(0).derive(index);
        
        // Get the public key
        const publicKey = child.publicKey;
        
        // Generate P2PKH address (legacy address)
        const { address } = bitcoin.payments.p2pkh({
          pubkey: Buffer.from(publicKey),
          network: this.network
        });
        
        if (!address) {
          throw new Error('Failed to generate address');
        }
        
        console.log(`[PremiumService] Generated address ${address} for ${normalizedEmail}`);
        
        // Store the email-address mapping
        const premiumStatus = this.getPremiumStatus();
        this.store.set('premium', {
          ...premiumStatus,
          email: normalizedEmail,
          bitcoinAddress: address
        });
        
        return address;
      } catch (derivationError) {
        console.error('Error in BIP32 derivation:', derivationError);
        
        // Fallback to a deterministic but simpler method if BIP32 fails
        const fallbackHash = crypto.createHash('sha256')
          .update(`${this.xpub}-${normalizedEmail}-fallback`)
          .digest('hex');
          
        const fallbackAddress = `1${fallbackHash.substring(0, 33)}`;
        console.log(`[PremiumService] Using fallback address ${fallbackAddress}`);
        
        // Store the fallback address
        const premiumStatus = this.getPremiumStatus();
        this.store.set('premium', {
          ...premiumStatus,
          email: normalizedEmail,
          bitcoinAddress: fallbackAddress,
          isFallback: true
        });
        
        return fallbackAddress;
      }
    } catch (error) {
      console.error('Error generating Bitcoin address:', error);
      
      // Last resort fallback
      const emergencyAddress = '1BitcoinEaterAddressDontSendf59kuE';
      
      // Store the emergency address
      try {
        const premiumStatus = this.getPremiumStatus();
        this.store.set('premium', {
          ...premiumStatus,
          bitcoinAddress: emergencyAddress,
          isEmergencyFallback: true
        });
      } catch (storeError) {
        console.error('Error updating store:', storeError);
      }
      
      return emergencyAddress;
    }
  }
  
  /**
   * Check if the user has made the required payment
   * 
   * @param forceCheck Force checking even if recently checked
   * @returns Premium status
   */
  public async checkPremiumStatus(forceCheck = false): Promise<PremiumStatus> {
    const currentStatus = this.getPremiumStatus();
    const nowTime = new Date();
    
    // IMPORTANT FIX: Force re-verification if there's a payment but it's not verified
    // This helps handle the case where payment is present but not yet verified
    // due to code updates or other reasons
    if (currentStatus.paymentAmount && !currentStatus.isPremium) {
      console.log('[PremiumService] Payment detected but not verified, forcing re-verification');
      forceCheck = true;
    }
    
    // Check if the premium status has expired (subscription > 1 year old)
    if (currentStatus.isPremium && currentStatus.expiresAt) {
      const expiryDate = new Date(currentStatus.expiresAt);
      if (nowTime > expiryDate) {
        console.log(`[PremiumService] Premium subscription expired on ${expiryDate.toLocaleDateString()}`);
        
        // Set status as expired but keep the payment record
        const expiredStatus: PremiumStatus = {
          ...currentStatus,
          isPremium: false,
          paymentVerified: false,
          hasExpired: true,
          lastChecked: nowTime
        };
        
        this.store.set('premium', expiredStatus);
        return expiredStatus;
      }
    }
    
    // If already verified or checked recently (within last hour) and not forcing check
    if (!forceCheck && 
        (currentStatus.paymentVerified || 
         (currentStatus.lastChecked && 
          (nowTime.getTime() - new Date(currentStatus.lastChecked).getTime() < 3600000)))) {
      return currentStatus;
    }
    
    // Need an email and address to proceed
    if (!currentStatus.email || !currentStatus.bitcoinAddress) {
      return currentStatus;
    }
    
    try {
      // First check if we need to update the price
      if (!currentStatus.btcPriceUSD || forceCheck) {
        try {
          await this.fetchBitcoinPrice();
        } catch (priceError) {
          console.error('[PremiumService] Error updating BTC price:', priceError);
        }
      }
      
      // Query mempool.space API to check balance
      console.log(`[PremiumService] [DEBUG] Checking payment for address: ${currentStatus.bitcoinAddress}`);
      const response = await this.queryMempoolAddressApi(currentStatus.bitcoinAddress);
      
      // Calculate total received (confirmed + unconfirmed)
      const confirmedReceived = response.chain_stats.funded_txo_sum;
      const confirmedSpent = response.chain_stats.spent_txo_sum;
      const pendingReceived = response.mempool_stats.funded_txo_sum;
      const pendingSpent = response.mempool_stats.spent_txo_sum;
      
      const totalReceivedSats = confirmedReceived + pendingReceived - confirmedSpent - pendingSpent;
      
      console.log(`[PremiumService] [DEBUG] Payment verification details:
        Confirmed received: ${confirmedReceived} sats
        Confirmed spent: ${confirmedSpent} sats
        Pending received: ${pendingReceived} sats
        Pending spent: ${pendingSpent} sats
        Total balance: ${totalReceivedSats} sats
        Confirmed tx count: ${response.chain_stats.tx_count}
        Pending tx count: ${response.mempool_stats.tx_count}
      `);
      
      // Calculate current required payment in BTC
      const requiredBtcAmount = this.minimumPaymentUSD / this.btcPriceUSD;
      const requiredSats = Math.ceil(requiredBtcAmount * 100000000);
      
      // Use the stored required payment or the dynamically calculated one
      const minimumPaymentSats = this.minimumPaymentSats || requiredSats;
      
      // Allow ±5% tolerance in the payment amount
      const tolerancePercent = 5;
      const lowerBoundSats = Math.floor(minimumPaymentSats * (1 - tolerancePercent / 100));
      
      // Check if any payment was made (for day-after auto-unlock)
      const hasAnyPayment = totalReceivedSats > 0;
      
      // Output exactly how close we are as a percentage
      if (hasAnyPayment) {
        const paymentPercentage = (totalReceivedSats / minimumPaymentSats) * 100;
        console.log(`[PremiumService] [DEBUG] Payment is ${paymentPercentage.toFixed(2)}% of required amount`);
      }
      
      const hasPaymentWithinTolerance = totalReceivedSats >= lowerBoundSats;
      
      // Check if this might be a payment from yesterday or before
      let isPastPayment = false;
      if (hasAnyPayment && response.chain_stats.tx_count > 0) {
        // Try to get the timestamp of the first transaction
        try {
          // Fetch transactions to check their timestamps
          const transactions = await this.fetchAddressTransactions(currentStatus.bitcoinAddress);
          if (transactions && transactions.length > 0) {
            // Get the earliest transaction timestamp (if confirmed)
            const earliestTx = transactions[transactions.length - 1]; // Newest transactions come first
            if (earliestTx.status && earliestTx.status.confirmed && earliestTx.status.block_time) {
              const txTime = new Date(earliestTx.status.block_time * 1000);
              const now = new Date();
              const oneDayAgo = new Date(now);
              oneDayAgo.setDate(now.getDate() - 1);
              
              // Is transaction from yesterday or earlier?
              isPastPayment = txTime <= oneDayAgo;
              
              console.log(`[PremiumService] [DEBUG] Transaction time check:
                Transaction time: ${txTime.toISOString()}
                One day ago: ${oneDayAgo.toISOString()}
                Is past payment: ${isPastPayment}
              `);
            }
          }
        } catch (txError) {
          console.error('[PremiumService] [DEBUG] Error checking transaction time:', txError);
        }
      }
      
      // Payment is verified if:
      // 1. It's within 5% tolerance of required amount, OR
      // 2. There's any payment amount and it was made at least a day ago
      const isPaymentVerified = hasPaymentWithinTolerance || (hasAnyPayment && isPastPayment);
      
      console.log(`[PremiumService] [DEBUG] Payment requirements:
        Current BTC price: $${this.btcPriceUSD}
        Required USD amount: $${this.minimumPaymentUSD}
        Required BTC amount: ${requiredBtcAmount.toFixed(8)} BTC
        Required sats: ${requiredSats} sats
        Minimum payment with tolerance (-${tolerancePercent}%): ${lowerBoundSats} sats
        Has any payment: ${hasAnyPayment}
        Is within tolerance: ${hasPaymentWithinTolerance}
        Is past payment: ${isPastPayment}
        Payment verified: ${isPaymentVerified}
      `);
      
      // Update premium status based on response
      const updatedStatus: PremiumStatus = {
        ...currentStatus,
        lastChecked: new Date(),
        paymentAmount: totalReceivedSats / 100000000, // Convert sats to BTC
        premiumPriceUSD: this.minimumPaymentUSD,
        premiumPriceBTC: requiredBtcAmount,
        btcPriceUSD: this.btcPriceUSD,
        paymentVerified: isPaymentVerified,
        isPremium: isPaymentVerified,
        // Track if this was a partial payment that was accepted
        partialPayment: hasAnyPayment && !hasPaymentWithinTolerance && isPastPayment
      };
      
      // If newly verified as premium, set expiration date to 1 year from now
      if (updatedStatus.paymentVerified && !currentStatus.paymentVerified) {
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        updatedStatus.expiresAt = expiryDate;
      }
      
      // Save to store
      this.store.set('premium', updatedStatus);
      
      return updatedStatus;
    } catch (error) {
      console.error('Error checking premium status:', error);
      
      // Update last checked time despite error
      this.store.set('premium.lastChecked', new Date());
      
      return {
        ...currentStatus,
        lastChecked: new Date()
      };
    }
  }
  
  /**
   * Set premium status manually (for testing)
   * 
   * @param status Premium status to set
   */
  public setPremiumStatus(status: Partial<PremiumStatus>): void {
    const currentStatus = this.getPremiumStatus();
    this.store.set('premium', {
      ...currentStatus,
      ...status
    });
  }
  
  /**
   * Query mempool.space API for address information
   * 
   * @param address Bitcoin address to check
   * @returns Address information
   */
  private queryMempoolAddressApi(address: string): Promise<MempoolSpaceAddressResponse> {
    return new Promise((resolve, reject) => {
      console.log(`[PremiumService] [DEBUG] Querying mempool.space API for address: ${address}`);
      const apiUrl = `https://mempool.space/api/address/${address}`;
      console.log(`[PremiumService] [DEBUG] API URL: ${apiUrl}`);
      
      const request = net.request({
        method: 'GET',
        url: apiUrl
      });
      
      let data = '';
      
      request.on('response', (response) => {
        console.log(`[PremiumService] [DEBUG] Response status code: ${response.statusCode}`);
        
        response.on('data', (chunk) => {
          data += chunk.toString();
        });
        
        response.on('end', () => {
          try {
            if (response.statusCode !== 200) {
              console.error(`[PremiumService] [DEBUG] API error: ${response.statusCode}: ${data}`);
              reject(new Error(`API request failed with status code ${response.statusCode}: ${data}`));
              return;
            }
            
            console.log(`[PremiumService] [DEBUG] API raw response: ${data}`);
            const parsedData = JSON.parse(data);
            console.log(`[PremiumService] [DEBUG] Address data:`, JSON.stringify(parsedData, null, 2));
            
            // After getting the basic address data, also check for transactions
            this.fetchAddressTransactions(address)
              .then(txData => {
                console.log(`[PremiumService] [DEBUG] Found ${txData.length} transactions for address ${address}`);
                resolve(parsedData);
              })
              .catch(txError => {
                console.error(`[PremiumService] [DEBUG] Error fetching transactions: ${txError}`);
                // Still resolve with the address data even if tx fetch fails
                resolve(parsedData);
              });
          } catch (error) {
            console.error(`[PremiumService] [DEBUG] Error parsing API response: ${error}`);
            reject(error);
          }
        });
      });
      
      request.on('error', (error) => {
        console.error(`[PremiumService] [DEBUG] API request error: ${error}`);
        reject(error);
      });
      
      request.end();
    });
  }
  
  /**
   * Fetch transactions for an address
   * 
   * @param address Bitcoin address to check
   * @returns Array of transactions
   */
  private fetchAddressTransactions(address: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      console.log(`[PremiumService] [DEBUG] Fetching transactions for address: ${address}`);
      const apiUrl = `https://mempool.space/api/address/${address}/txs`;
      
      const request = net.request({
        method: 'GET',
        url: apiUrl
      });
      
      let data = '';
      
      request.on('response', (response) => {
        response.on('data', (chunk) => {
          data += chunk.toString();
        });
        
        response.on('end', () => {
          try {
            if (response.statusCode !== 200) {
              reject(new Error(`Transactions API request failed with status code ${response.statusCode}: ${data}`));
              return;
            }
            
            const transactions = JSON.parse(data);
            console.log(`[PremiumService] [DEBUG] Transaction data:`, JSON.stringify(transactions, null, 2));
            
            // Log specific details about each transaction
            if (Array.isArray(transactions)) {
              transactions.forEach((tx, index) => {
                const receivedValue = this.calculateReceivedValue(tx, address);
                console.log(`[PremiumService] [DEBUG] Transaction #${index + 1}:
                  ID: ${tx.txid}
                  Status: ${tx.status.confirmed ? 'Confirmed' : 'Unconfirmed'}
                  ${tx.status.confirmed ? `Block: ${tx.status.block_height}` : 'In mempool'}
                  Value received: ${receivedValue / 100000000} BTC (${receivedValue} sats)
                  Fee: ${tx.fee} sats
                  Time: ${tx.status.block_time ? new Date(tx.status.block_time * 1000).toISOString() : 'Pending'}
                `);
              });
            }
            
            resolve(transactions);
          } catch (error) {
            console.error(`[PremiumService] [DEBUG] Error parsing transactions:`, error);
            reject(error);
          }
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.end();
    });
  }
  
  /**
   * Calculate the value received by an address in a transaction
   * 
   * @param tx Transaction object from mempool.space API
   * @param address Bitcoin address to calculate received value for
   * @returns Value received in satoshis
   */
  private calculateReceivedValue(tx: any, address: string): number {
    let received = 0;
    
    // Check outputs for payments to our address
    if (tx.vout && Array.isArray(tx.vout)) {
      tx.vout.forEach((output: any) => {
        if (output.scriptpubkey_address === address) {
          received += output.value;
        }
      });
    }
    
    return received;
  }
  
  /**
   * Fetch the current Bitcoin price in USD from mempool.space API
   * 
   * @returns Current Bitcoin price in USD
   */
  public async fetchBitcoinPrice(): Promise<number> {
    try {
      return new Promise<number>((resolve, reject) => {
        const request = net.request({
          method: 'GET',
          url: 'https://mempool.space/api/v1/prices'
        });
        
        let data = '';
        
        request.on('response', (response) => {
          response.on('data', (chunk) => {
            data += chunk.toString();
          });
          
          response.on('end', () => {
            try {
              if (response.statusCode !== 200) {
                reject(new Error(`API request failed with status code ${response.statusCode}: ${data}`));
                return;
              }
              
              const parsedData = JSON.parse(data) as MempoolSpacePriceResponse;
              this.btcPriceUSD = parsedData.USD;
              
              console.log(`[PremiumService] Current BTC price: $${parsedData.USD}`);
              resolve(parsedData.USD);
            } catch (error) {
              reject(error);
            }
          });
        });
        
        request.on('error', (error) => {
          reject(error);
        });
        
        request.end();
      });
    } catch (error) {
      console.error('[PremiumService] Error fetching Bitcoin price:', error);
      return 0;
    }
  }
  
  /**
   * Get premium subscription price in BTC
   * 
   * @returns Minimum BTC amount required for premium
   */
  public getPremiumPriceBTC(): number {
    // If we have a BTC price in USD, calculate the amount dynamically
    if (this.btcPriceUSD > 0) {
      return this.minimumPaymentUSD / this.btcPriceUSD;
    }
    
    // Fall back to fixed amount if price not available
    return this.minimumPaymentSats / 100000000;
  }
  
  /**
   * Get premium subscription price in USD
   * 
   * @returns Minimum USD amount required for premium
   */
  public getPremiumPriceUSD(): number {
    return this.minimumPaymentUSD;
  }
  
  /**
   * Get current Bitcoin price in USD
   * 
   * @returns Current Bitcoin price in USD
   */
  public getBitcoinPriceUSD(): number {
    return this.btcPriceUSD;
  }
  
  /**
   * Set the XPUB key for address derivation
   * 
   * @param xpub The extended public key to use for generating addresses
   * @returns true if the key was valid and set successfully
   */
  public setXpub(xpub: string): boolean {
    try {
      // Check if xpub starts with the expected prefix for the current network
      const isValidPrefix = this.network === bitcoin.networks.testnet 
        ? xpub.startsWith('tpub') 
        : xpub.startsWith('xpub') || xpub.startsWith('ypub') || xpub.startsWith('zpub');
      
      if (!isValidPrefix) {
        console.error('[PremiumService] Invalid XPUB prefix for the current network');
        return false;
      }
      
      // Validate the xpub key by trying to derive a node
      const node = bip32.fromBase58(xpub, this.network);
      
      // If we get here, the key is valid
      this.xpub = xpub;
      console.log(`[PremiumService] Updated XPUB key: ${xpub.substring(0, 10)}...`);
      return true;
    } catch (error) {
      console.error('[PremiumService] Invalid XPUB key provided:', error);
      return false;
    }
  }
  
  /**
   * Get the current XPUB key (masked for security)
   * 
   * @returns Masked version of the current XPUB key
   */
  public getXpubMasked(): string {
    if (!this.xpub) return '';
    
    const start = this.xpub.substring(0, 8);
    const end = this.xpub.substring(this.xpub.length - 4);
    return `${start}...${end}`;
  }
}
