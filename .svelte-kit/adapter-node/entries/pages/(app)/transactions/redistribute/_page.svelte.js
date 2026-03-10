import "clsx";
import { T as TransactionForm } from "../../../../../chunks/TransactionForm.js";
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
export {
  _page as default
};
