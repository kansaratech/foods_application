// Interface
import { IDropdownComponentProps } from "@/lib/utils/interfaces";

// Prime React
import { Dropdown, DropdownChangeEvent } from "primereact/dropdown";
import InputSkeleton from "../custom-skeletons/inputfield.skeleton";
import { faAdd } from "@fortawesome/free-solid-svg-icons";
import TextIconClickable from "../text-icon-clickable";

const CustomDropdownComponent = ({
  name,
  placeholder,
  options,
  selectedItem,
  setSelectedItem,
  showLabel,
  isLoading = false,
  filter = true,
  extraFooterButton,
  ...props
}: IDropdownComponentProps) => {
  const itemTemplate = (option: { label: string }) => {
    return (
      <div className="align-items-center flex text-gray-800 dark:text-gray-100 dark:bg-gray-800">
        <div>{option.label}</div>
      </div>
    );
  };

  const panelFooterTemplate = () => {
    return (
      <div className="flex justify-between space-x-2 dark:border-gray-600">
        {extraFooterButton?.title && (
          <TextIconClickable
            className="w-full h-fit rounded  text-black dark:bg-gray-700 "
            icon={faAdd}
            iconStyles={{ color: "black" }}
            title={extraFooterButton.title}
            onClick={extraFooterButton.onChange}
          />
        )}
      </div>
    );
  };

  return !isLoading ? (
    <div className={`flex w-full flex-col justify-center gap-y-1`}>
      {showLabel && (
        <label
          htmlFor="username"
          className="text-sm font-[500] text-gray-700 dark:text-gray-200"
        >
          {placeholder}
        </label>
      )}

      <Dropdown
        value={selectedItem}
        options={options}
        onChange={(e: DropdownChangeEvent) => setSelectedItem(name, e.value)}
        optionLabel="label"
        placeholder={placeholder}
        itemTemplate={itemTemplate}
        className="md:w-20rem m-0 h-10 w-full border border-gray-300 dark:border-gray-600
             bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100
             rounded focus:shadow-none focus:outline-none text-sm"
        panelClassName="border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
        filter={filter}
        checkmark
        focusOnHover={false}
        panelFooterTemplate={panelFooterTemplate}
        // Without this, PrimeReact appends the overlay panel inline right
        // after the trigger instead of portaling it — when this dropdown
        // sits inside a Dialog (as it does here, in the address modal), the
        // Dialog's own z-index/mask layering can trap the panel behind it or
        // clip it, making the dropdown look completely unresponsive.
        appendTo={typeof document !== "undefined" ? document.body : undefined}
        {...props}
      />
    </div>
  ) : (
    <InputSkeleton />
  );
};

export default CustomDropdownComponent;
