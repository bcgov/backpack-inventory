import { T as TransactionForm } from './TransactionForm-B-HnphgQ.js';
import './index3-B028t-nf.js';
import './root--oAzNBGx.js';
import './exports-7ECo9oy7.js';
import './state.svelte-07kk-jLd.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, form } = $$props;
    TransactionForm($$renderer2, {
      action: "redistribute",
      offices: data.offices,
      products: data.products,
      categories: data.categories,
      onBehalfUsers: data.onBehalfUsers,
      destinationOffices: data.destinationOffices,
      form
    });
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-CHZdecqH.js.map
