/* Provider boundary. Real models require a separately authorized server endpoint.
   Never put an API key in this browser application. This build uses MockProvider only. */
(function(root){
class MockProvider {
  constructor(engine){this.engine=engine;this.mode='mock';}
  async analyzeProfile(state){return root.ProfileAnalyst.analyze(state);}
  async generateEvent(state,{signal}={}){if(signal?.aborted)throw new DOMException('Cancelled','AbortError');return this.engine.eventFor(state);}
  async parseAction(state,text,{signal}={}){if(signal?.aborted)throw new DOMException('Cancelled','AbortError');return this.engine.parse(state,text);}
}
class HttpProvider {
  constructor({endpoint,authorized=false}){if(!authorized)throw Error('真实模型尚未授权');this.endpoint=endpoint;this.mode='remote';}
  async analyzeProfile(state,{signal}={}){const response=await fetch(this.endpoint+'/profile/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({evidence:state.evidence,goal:state.goal,dialogue:state.chats,decisions:state.ledger.map(l=>({event:l.event.title,action:l.actionId,reason:l.proposal.reason})),city:state.city||null,corrections:state.analystCorrections||{}}),signal});if(!response.ok)throw Error('画像服务不可用');return root.ProfileAnalyst.validate(await response.json(),state);}
  async generateEvent(state,{signal}={}){const response=await fetch(this.endpoint+'/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({round:state.round,goal:state.goal}),signal});if(!response.ok)throw Error('事件服务不可用');const event=await response.json();root.Game.validate(event);return event;}
}
root.PandaProviders={MockProvider,HttpProvider};
})(typeof window==='undefined'?globalThis:window);
