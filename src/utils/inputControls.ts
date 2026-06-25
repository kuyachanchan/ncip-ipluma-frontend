export const handleThreeDigitForNumberInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.value !== "") {
        const numericValue = Number(event.target.value)
        if (isNaN(numericValue)) {
            // If the value is not a number, reset it to an empty string
            event.target.value = "";
        }
        if (numericValue < 1) {
            event.target.value = "1";
        }
        if (numericValue > 999) {
            event.target.value = "999";
        }
    }
}