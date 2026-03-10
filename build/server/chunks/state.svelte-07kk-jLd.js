import { Y as noop } from './index3-B028t-nf.js';
import './root--oAzNBGx.js';

const is_legacy = noop.toString().includes("$$") || /function \w+\(\) \{\}/.test(noop.toString());
if (is_legacy) {
  ({
    url: new URL("https://example.com")
  });
}
//# sourceMappingURL=state.svelte-07kk-jLd.js.map
