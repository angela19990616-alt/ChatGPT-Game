// Portable Worker source only; not an officially packaged Sites deployment.
// Parent must migrate the existing Site through its official Worker starter/helper.
import {handleApi,auth} from './api.mjs';
export default {async fetch(request,env){if(!auth(request,env))return new Response('Authentication required',{status:401,headers:{'www-authenticate':'Basic realm="Panda City"'}});if(new URL(request.url).pathname.startsWith('/api/'))return handleApi(request,env);return env.ASSETS.fetch(request);}};
