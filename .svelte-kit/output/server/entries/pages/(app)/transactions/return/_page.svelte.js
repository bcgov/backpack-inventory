import "clsx";
import { T as TransactionForm } from "../../../../../chunks/TransactionForm.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, form } = $$props;
    TransactionForm($$renderer2, {
      action: "return",
      offices: data.offices,
      products: data.products,
      categories: data.categories,
      onBehalfUsers: data.onBehalfUsers,
      form
    });
  });
}
export {
  _page as default
};
