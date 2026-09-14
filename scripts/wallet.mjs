// Local operator console only: all amounts are simulated integer cents.
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {SimulatedWallet} from '../lib/wallet.ts';
const [action='status',id='local',input]=process.argv.slice(2);
const directory=resolve('.local');mkdirSync(directory,{recursive:true});
const wallet=new SimulatedWallet(resolve(directory,'simulation.sqlite'));
try {
 let output;
 switch(action){
  case 'init': output=wallet.create(id,input===undefined?5000:Number(input));break;
  case 'status': output=wallet.snapshot(id);break;
  case 'ledger': output=wallet.ledger(id);break;
  case 'post': output=wallet.post(id,JSON.parse(input??'{}'));break;
  default: throw new Error('Use init, status, ledger or post. Amounts are simulated cents.');
 }
 console.log(JSON.stringify({simulation:true,currency:'USD',unit:'cents',result:output},null,2));
} catch(error){console.error(error.message);process.exitCode=1;} finally {wallet.close();}
