export default function Zoom(target, options) {
    const originalizer =
        options && options.originalizer
            ? options.originalizer
            : (src) => {
                  return src;
              };
    const screenSize = {
        screenWidth: 0,
        screenHeight: 0,
        scrollBar: 0,
    };
    const background =
        options && options.background ? options.background : null;

    const updateScreenSize = () => {
        const { documentElement } = document;

        screenSize.screenWidth =
            window.innerWidth || documentElement.clientWidth;
        screenSize.screenHeight =
            window.innerHeight || documentElement.clientHeight;
        screenSize.scrollBar =
            screenSize.screenWidth - documentElement.offsetWidth;
    };

    const zoom = (image) => {
        const src = image.currentSrc || image.src;
        const { srcset } = image;
        const { screenWidth, screenHeight, scrollBar } = screenSize;
        const { width, height, left, top } = image.getBoundingClientRect();
        const wrapX = (screenWidth - scrollBar) / 2 - left - width / 2;
        const wrapY = -top + (screenHeight - height) / 2;
        const bg = document.createElement("div");
        const imageClone = document.createElement("img");

        const removeImage = () => {
            bg.classList.remove("zoom-bg--reveal");
            imageClone.style.transform = "";
            imageClone.addEventListener(
                "transitionend",
                () => {
                    bg.remove();
                    image.classList.remove("zoom-original--hidden");
                    imageClone.remove();
                },
                { once: true }
            );
            bg.removeEventListener("click", removeImage);
            imageClone.removeEventListener("click", removeImage);
            window.removeEventListener("scroll", removeImage);
            window.removeEventListener("resize", removeImage);
        };

        let maxWidth = image.naturalWidth;

        imageClone.style.top = `${top + window.scrollY}px`;
        imageClone.style.left = `${left}px`;
        imageClone.style.width = `${width}px`;
        imageClone.style.height = `${height}px`;

        bg.classList.add("zoom-bg");

        if (background) {
            if (background === "auto") {
                const average = getAverageRGB(image);
                bg.style.background = average
                    ? `rgb(${average.r}, ${average.g}, ${average.b})`
                    : "rgb(0, 0, 0)";
            } else {
                bg.style.background = background;
            }
        }

        if (srcset) {
            const sizes = srcset.match(/ ([0-9]+)w/gm);

            if (sizes) {
                // Find image's largest width in 'srcset' attribute
                sizes.forEach((size) => {
                    const sizeNum = +size.trim().replace("w", "");

                    sizeNum > maxWidth && (maxWidth = sizeNum);
                });
            }
        }

        const ratio = height / width;

        // Image's width shouldn't be larger than screen width
        maxWidth >= screenWidth && (maxWidth = screenWidth);
        // And height too
        const maxHeight = maxWidth * ratio;
        maxHeight >= screenHeight &&
            (maxWidth = (maxWidth * screenHeight) / maxHeight);

        imageClone.classList.add("zoom-img");
        imageClone.src = src;
        imageClone.width = width;
        imageClone.height = height;

        bg.addEventListener("click", removeImage, { once: true });
        imageClone.addEventListener("click", removeImage, { once: true });
        window.addEventListener("scroll", removeImage, { once: true });
        window.addEventListener("resize", removeImage, { once: true });

        document.body.append(bg);
        document.body.append(imageClone);

        // Just for causing style recalculation
        imageClone.offsetWidth;

        // hide original image
        image.classList.add("zoom-original--hidden");
        // reveal and center cloned image, scale up if needed
        const scale = maxWidth !== width ? maxWidth / width : 1;

        imageClone.style.transform = `matrix(${scale}, 0, 0, ${scale}, ${wrapX}, ${wrapY})`;
        bg.classList.add("zoom-bg--reveal");

        imageClone.addEventListener("transitionend", () => {
            // replace image's source to original source
            imageClone.src = originalizer(src);
        });
    };

    const handleClick = (event) => {
        zoom(event.target);
    };

    const getAverageRGB = (img) => {
        const blockSize = 5;
        const rgb = { r: 0, g: 0, b: 0 };
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        const width = (canvas.width =
            img.naturalWidth || img.offsetWidth || img.width);
        const height = (canvas.height =
            img.naturalHeight || img.offsetHeight || img.height);

        let data;
        let i = -4;
        let length;
        let count = 0;

        ctx.drawImage(img, 0, 0);

        try {
            data = ctx.getImageData(0, 0, width, height);
        } catch (e) {
            return null;
        }

        length = data.data.length;
        while ((i += blockSize * 4) < length) {
            ++count;
            rgb.r += data.data[i];
            rgb.g += data.data[i + 1];
            rgb.b += data.data[i + 2];
        }

        rgb.r = Math.floor(rgb.r / count);
        rgb.g = Math.floor(rgb.g / count);
        rgb.b = Math.floor(rgb.b / count);

        return rgb;
    };

    const attach = (target) => {
        if (!target) return;

        if (typeof target === "string") {
            document.querySelectorAll(target).forEach(addZoomEvent);
        } else if (target instanceof HTMLElement) {
            addZoomEvent(target);
        } else if (target instanceof NodeList || target instanceof Array) {
            target.forEach(addZoomEvent);
        }

        // Add cursor style for target
        if (typeof target === "string") {
            const style = document.createElement("style");
            const head =
                document.head || document.getElementsByTagName("head")[0];

            style.appendChild(
                document.createTextNode(`${target}{cursor:zoom-in}`)
            );
            head.appendChild(style);
        }
    };

    const addZoomEvent = (element) => {
        if (!(element instanceof HTMLElement)) return;
        if (element.tagName === "IMG") {
            element.addEventListener("click", handleClick);
        } else {
            const childImg = element.querySelector("img");
            if (childImg) {
                childImg.addEventListener("click", handleClick);
            }
        }
    };

    updateScreenSize();
    window.addEventListener("resize", updateScreenSize, { passive: true });

    attach(target);

    return {
        zoom,
        attach,
    };
}
