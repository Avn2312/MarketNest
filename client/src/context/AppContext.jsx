import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import {
    ERROR_MESSAGES,
    getFriendlyErrorMessage,
} from "../utils/errorMessages";

const configuredApiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? "/" : "https://marketnest-6dvx.onrender.com");
const apiBaseUrl =
    configuredApiBaseUrl === "/"
        ? configuredApiBaseUrl
        : configuredApiBaseUrl.replace(/\/+$/, "");

axios.defaults.withCredentials = true;
axios.defaults.baseURL = apiBaseUrl;

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
    const currency = import.meta.env.VITE_CURRENCY;
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [seller, setSeller] = useState(null);
    const [showUserLogin, setShowUserLogin] = useState(false);
    const [redirectPath, setRedirectPath] = useState("/");
    const [products, setProducts] = useState([]);
    const [cartItems, setCartItems] = useState(() => {
        const localCart = localStorage.getItem("cartItems");
        return localCart ? JSON.parse(localCart) : {};
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [isProductsLoading, setIsProductsLoading] = useState(true);
    const [isAuthResolved, setIsAuthResolved] = useState(false);

    const cartSyncTimeoutRef = useRef(null);
    const hasMergedGuestCartRef = useRef(false);

    const productMap = useMemo(
        () => new Map(products.map((product) => [product._id, product])),
        [products]
    );

    const getAvailableStock = useCallback(
        (itemId) => {
            const product = productMap.get(itemId);
            if (!product) return 0;

            if (typeof product.stockQuantity === "number") {
                return product.stockQuantity;
            }

            return product.inStock ? 24 : 0;
        },
        [productMap]
    );

    const getProductName = useCallback(
        (itemId) => productMap.get(itemId)?.name || "This item",
        [productMap]
    );

    const getStockLimitMessage = useCallback(
        (itemId, availableStock) => {
            const productName = getProductName(itemId);

            if (availableStock <= 0) {
                return `${productName} is currently out of stock.`;
            }

            if (availableStock === 1) {
                return `${productName} has only 1 item left right now.`;
            }

            return `${productName} has only ${availableStock} items left right now.`;
        },
        [getProductName]
    );

    const fetchProducts = useCallback(async () => {
        try {
            setIsProductsLoading(true);
            const { data } = await axios.get("/api/product/list");

            if (data.success) {
                setProducts(data.products);
            }
        } catch {
            toast.error(ERROR_MESSAGES.loadProducts);
        } finally {
            setIsProductsLoading(false);
        }
    }, []);

    const fetchUser = useCallback(async () => {
        try {
            const { data } = await axios.get("/api/user/me");

            if (data.success && data.user.role === "user") {
                setSeller(null);
                setUser(data.user);

                const localCart =
                    JSON.parse(localStorage.getItem("cartItems")) || {};
                const serverCart = data.user.cartItems || {};
                const hasGuestCart =
                    !hasMergedGuestCartRef.current &&
                    Object.keys(localCart).length > 0;

                const mergedCart = { ...serverCart };

                if (hasGuestCart) {
                    for (const itemId in localCart) {
                        mergedCart[itemId] =
                            (mergedCart[itemId] || 0) + localCart[itemId];
                    }
                }

                localStorage.removeItem("cartItems");
                hasMergedGuestCartRef.current = true;
                setCartItems(mergedCart);

                if (
                    hasGuestCart &&
                    JSON.stringify(mergedCart) !== JSON.stringify(serverCart)
                ) {
                    await axios.patch("/api/cart/update", {
                        cartItems: mergedCart,
                    });
                }
            }

            if (data.user?.role === "seller") {
                setUser(null);
                setSeller(data.user);
            }
        } catch {
            setUser(null);
            setSeller(null);
        } finally {
            setIsAuthResolved(true);
        }
    }, []);

    useEffect(() => {
        fetchUser();
        fetchProducts();
    }, [fetchProducts, fetchUser]);

    useEffect(() => {
        if (user) {
            localStorage.removeItem("cartItems");
            return;
        }

        hasMergedGuestCartRef.current = false;
        localStorage.setItem("cartItems", JSON.stringify(cartItems));
    }, [cartItems, user]);

    useEffect(() => {
        if (!products.length) return;

        setCartItems((previousCartItems) => {
            const nextCartItems = { ...previousCartItems };
            let hasChanges = false;

            Object.entries(previousCartItems).forEach(([itemId, quantity]) => {
                const availableStock = getAvailableStock(itemId);

                if (availableStock <= 0) {
                    delete nextCartItems[itemId];
                    hasChanges = true;
                    toast.error(
                        getFriendlyErrorMessage(
                            `${getProductName(
                                itemId
                            )} is now out of stock and was removed from your cart.`
                        )
                    );
                    return;
                }

                if (quantity > availableStock) {
                    nextCartItems[itemId] = availableStock;
                    hasChanges = true;
                    toast.error(
                        getFriendlyErrorMessage(
                            `We updated ${getProductName(
                                itemId
                            )} to ${availableStock} in your cart based on current stock.`
                        )
                    );
                }
            });

            return hasChanges ? nextCartItems : previousCartItems;
        });
    }, [getAvailableStock, getProductName, products]);

    useEffect(() => {
        if (cartSyncTimeoutRef.current) {
            clearTimeout(cartSyncTimeoutRef.current);
        }

        if (!user || !isAuthResolved) return;

        cartSyncTimeoutRef.current = setTimeout(async () => {
            try {
                await axios.patch("/api/cart/update", { cartItems });
            } catch {
                toast.error(ERROR_MESSAGES.updateCart);
            }
        }, 400);

        return () => {
            if (cartSyncTimeoutRef.current) {
                clearTimeout(cartSyncTimeoutRef.current);
            }
        };
    }, [cartItems, user, isAuthResolved]);

    const addToCart = (itemId) => {
        const availableStock = getAvailableStock(itemId);

        if (availableStock <= 0) {
            toast.error(
                getFriendlyErrorMessage(getStockLimitMessage(itemId, availableStock))
            );
            return;
        }

        const cartData = structuredClone(cartItems);
        const nextQuantity = (cartData[itemId] || 0) + 1;

        if (nextQuantity > availableStock) {
            toast.error(
                getFriendlyErrorMessage(getStockLimitMessage(itemId, availableStock))
            );
            return;
        }

        cartData[itemId] = nextQuantity;
        setCartItems(cartData);
        toast.success("Added to Cart");
    };

    const updateCartItem = (itemId, quantity) => {
        const cartData = structuredClone(cartItems);
        const availableStock = getAvailableStock(itemId);

        if (quantity <= 0) {
            delete cartData[itemId];
        } else if (quantity > availableStock) {
            cartData[itemId] = availableStock;
            toast.error(
                getFriendlyErrorMessage(getStockLimitMessage(itemId, availableStock))
            );
        } else {
            cartData[itemId] = quantity;
        }

        setCartItems(cartData);
        toast.success("Cart Updated");
    };

    const removeFromCart = (itemId) => {
        const cartData = structuredClone(cartItems);

        if (cartData[itemId]) {
            cartData[itemId] -= 1;
            if (cartData[itemId] <= 0) {
                delete cartData[itemId];
            }
        }

        setCartItems(cartData);
        toast.success("Removed from Cart");
    };

    const getCartCount = () =>
        Object.values(cartItems).reduce((accumulator, quantity) => {
            return accumulator + quantity;
        }, 0);

    const getCartAmount = () => {
        let total = 0;

        for (const itemId in cartItems) {
            const product = productMap.get(itemId);
            if (product) {
                total += product.offerPrice * cartItems[itemId];
            }
        }

        return parseFloat(total.toFixed(2));
    };

    const value = {
        navigate,
        user,
        setUser,
        seller,
        setSeller,
        showUserLogin,
        setShowUserLogin,
        products,
        currency,
        getAvailableStock,
        addToCart,
        cartItems,
        setCartItems,
        updateCartItem,
        removeFromCart,
        searchQuery,
        setSearchQuery,
        getCartCount,
        getCartAmount,
        axios,
        fetchProducts,
        fetchUser,
        redirectPath,
        setRedirectPath,
        isProductsLoading,
        isAuthResolved,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    return useContext(AppContext);
};
