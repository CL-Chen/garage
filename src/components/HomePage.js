import React, { useState, useEffect } from "react";
import { Contract, getDefaultProvider, providers, utils } from "ethers";
import { config } from "../config";
import abi from "../fixtures/abi.json";
import axios from "axios";

const formatIpfsUrl = (url) => {
  return url.replace(/ipfs:\/\//g, "https://cloudflare-ipfs.com/");
};

const contractAddress = "0xef71555F6a754fDC4D35903Fc1F8aEE11543028A";
// const middleManAddress = "0x9040B1f53f9c5100E632876f6DD552380a6B4763";

const provider = getDefaultProvider("rinkeby", { alchemy: config.alchemyKey });
const contract = new Contract(contractAddress, abi, provider);

export const HomePage = () => {
  const [mintedNftState, setMintedNftState] = useState({
    state: "UNINITIALIZED",
  });
  const [transactionState, setTansactionState] = useState({
    state: "UNINITIALIZED",
  });

  const modalVisible =
    transactionState.state === "PENDING_METAMASK" ||
    transactionState.state === "PENDING_SIGNER" ||
    transactionState.state === "PENDING_CONFIRMAION";

  const loadRobotsData = async () => {
    setMintedNftState({
      state: "PENDING",
    });

    const totalSupply = await contract.totalSupply();
    const ids = [...Array(Number(totalSupply)).keys()];
    const deferredData = ids.reverse().map(async (id) => {
      const ipfsUri = await contract.tokenURI(id);
      const owner = await contract.ownerOf(id);
      const formattedUri = formatIpfsUrl(ipfsUri);
      const metadata = (await axios.get(formattedUri)).data;
      const formattedImage = formatIpfsUrl(metadata.image);
      const resalePriceObject = await contract.getResalePrice(id);
      const resalePrice = parseInt(
        resalePriceObject[Object.keys(resalePriceObject)[0]],
        16
      );
      const approvedContract = await contract.getApproved(id);

      return {
        id,
        name: metadata.name,
        image: formattedImage,
        description: metadata.description,
        owner,
        resalePrice,
        approvedContract,
      };
    });
    const data = await Promise.all(deferredData);
    setMintedNftState({
      state: "SUCCESS",
      data,
    });
  };

  useEffect(() => {
    loadRobotsData();
  }, []);

  // ============================================= Button Handlers ==================================================//

  // ----------------------1st Handler : purchase One Token (mint new token---------------------- //
  const handleBuyAnimal = async (id) => {
    const { ethereum } = window;
    if (typeof ethereum == "undefined") alert("Metamask is not detected");
    setTansactionState({ state: "PENDING_METAMASK" });
    await ethereum.request({ method: "eth_requestAccounts" });
    const provider_MetaMask = new providers.Web3Provider(window.ethereum);
    const signer = provider_MetaMask.getSigner();
    const contract = new Contract(contractAddress, abi, signer);
    setTansactionState({ state: "PENDING_SIGNER" });
    try {
      const receipt = await contract.purchase({
        value: utils.parseEther("1"),
      });
      setTansactionState({ state: "PENDING_CONFIRMAION" });
      const transaction = await receipt.wait();
      setTansactionState({ state: "SUCCESS", transaction });
    } catch (err) {
      if (err.code === "INSUFFICIENT_FUNDS") {
        alert("INSUFFICIENT_FUNDS");
        return setTansactionState({ state: "UNINITIALIZED" });
      } else {
        console.log(err);
        return setTansactionState({ state: "UNINITIALIZED" });
      }
    }

    await loadRobotsData();
  };

  // ----------------------2nd Handler : purchase Multiple Tokens---------------------- //
  const [buyQty, setBuyQty] = useState("1");

  const handlePurchaseMultiple = async () => {
    const { ethereum } = window;
    if (typeof ethereum == "undefined") alert("Metamask is not detected");
    setTansactionState({ state: "PENDING_METAMASK" });
    await ethereum.request({ method: "eth_requestAccounts" });
    const provider_MetaMask = new providers.Web3Provider(window.ethereum);
    const signer = provider_MetaMask.getSigner();
    const contract = new Contract(contractAddress, abi, signer);

    setTansactionState({ state: "PENDING_SIGNER" });
    try {
      const receipt = await contract.purchaseMultipleTokens(buyQty, {
        value: utils.parseEther(buyQty),
      });
      setTansactionState({ state: "PENDING_CONFIRMAION" });
      const transaction = await receipt.wait();
      setTansactionState({ state: "SUCCESS", transaction });
    } catch (err) {
      if (err.code === "INSUFFICIENT_FUNDS") {
        alert("INSUFFICIENT_FUNDS");
      }
      console.log(err.code);
      return setTansactionState({ state: "UNINITIALIZED" });
    }

    await loadRobotsData();
  };

  // ----------------------3rd Handler: Transfer token to others (e.g. Gift)---------------------- //

  // -----------------track variables------------------//
  const [recAddress, setRecAddress] = useState(null);
  // const [senderAddress, setSenderAddress] = useState(null);
  // const [tokenId, setTokenId] = useState("nullID");
  // -----------------track variables------------------//

  const handleGift = async (id, owner) => {
    const { ethereum } = window;
    if (typeof ethereum == "undefined") alert("Metamask is not detected");
    setTansactionState({ state: "PENDING_METAMASK" });
    await ethereum.request({ method: "eth_requestAccounts" });
    if (recAddress === null) {
      setTansactionState({ state: "UNINITIALIZED" });
      return alert("No address detected in input box");
    }

    const provider_MetaMask = new providers.Web3Provider(window.ethereum);
    const signer = provider_MetaMask.getSigner();
    const contract = new Contract(contractAddress, abi, signer);

    setTansactionState({ state: "PENDING_SIGNER" });
    try {
      let receipt = await contract.transferFrom(owner, recAddress, id);
      setTansactionState({ state: "PENDING_CONFIRMAION" });
      const transaction = await receipt.wait();
      setTansactionState({ state: "SUCCESS", transaction });
    } catch (err) {
      if (err.code === 4001) {
        return setTansactionState({ state: "UNINITIALIZED" });
      } else if (err.code === "UNPREDICTABLE_GAS_LIMIT") {
        alert(
          "Unauthorised transaction, you are not the owner of the NFT token!"
        );
        return setTansactionState({ state: "UNINITIALIZED" });
      } else {
        alert(err.message);
        setTansactionState({ state: "UNINITIALIZED" });
      }
    }

    await loadRobotsData();
    setRecAddress("nullAdd");
  };

  // ----------------------4th Handler: Give approval to NFT Contract---------------------- //
  const [sellingPrice, setSellingPrice] = useState(null);
  const handleSetPrice = async (id) => {
    const { ethereum } = window;
    if (typeof ethereum == "undefined") alert("Metamask is not detected");
    setTansactionState({ state: "PENDING_METAMASK" });
    await ethereum.request({ method: "eth_requestAccounts" });
    const provider_MetaMask = new providers.Web3Provider(window.ethereum);
    const signer = provider_MetaMask.getSigner();
    const contract = new Contract(contractAddress, abi, signer);
    setTansactionState({ state: "PENDING_SIGNER" });

    try {
      const receipt = await contract.setResalePrice(
        utils.parseEther(sellingPrice.toString()),
        id
      );
      setTansactionState({ state: "PENDING_CONFIRMAION" });
      const transaction = await receipt.wait();
      setTansactionState({ state: "SUCCESS", transaction });
      setSellingPrice(null);
    } catch (err) {
      if (err.code === 4001) {
        return setTansactionState({ state: "UNINITIALIZED" });
      } else if (err.code === "UNPREDICTABLE_GAS_LIMIT") {
        alert("You are not the owner");
        return setTansactionState({ state: "UNINITIALIZED" });
      } else {
        alert(err.message);
        return setTansactionState({ state: "UNINITIALIZED" });
      }
    }

    await loadRobotsData();
  };

  // ----------------------5th Handler : Purchase from another owner---------------------- //

  const handleBuyFromOwner = async (id, resalePrice) => {
    const { ethereum } = window;
    if (typeof ethereum == "undefined") alert("Metamask is not detected");
    setTansactionState({ state: "PENDING_METAMASK" });
    await ethereum.request({ method: "eth_requestAccounts" });
    const provider_MetaMask = new providers.Web3Provider(window.ethereum);
    const signer = provider_MetaMask.getSigner();
    const contract = new Contract(contractAddress, abi, signer);

    setTansactionState({ state: "PENDING_SIGNER" });
    try {
      const receipt = await contract.facilitateSale(id, {
        value: utils.parseEther((resalePrice / 1e18).toString()),
      });
      setTansactionState({ state: "PENDING_CONFIRMAION" });
      const transaction = await receipt.wait();
      setTansactionState({ state: "SUCCESS", transaction });
    } catch (err) {
      if (err.code === "UNPREDICTABLE_GAS_LIMIT") {
        alert("---NOT FOR SALE!---");
        console.log(err);
        return setTansactionState({ state: "UNINITIALIZED" });
      } else if (err.code === 4001) {
        return setTansactionState({ state: "UNINITIALIZED" });
      } else {
        alert(err.message);
        setTansactionState({ state: "UNINITIALIZED" });
      }
    }

    await loadRobotsData();
  };

  //======================================REACT WEBSITE STARTS HERE======================================//
  //=====================================================================================================//
  return (
    <div className="min-h-screen bg-green-700">
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 ">
        <div className="text-gray-100 text-6xl pt-28 pb-20 font-myZoo">
          ANIMALS
        </div>

        <div className="mb-12">
          {/* 0======0 THE PURCHASE button 0======0 */}
          <button
            onClick={handleBuyAnimal}
            type="button"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-900 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Buy Your Own Animal
            <img
              className="float-left"
              src="https://img.icons8.com/ios-filled/30/DCFFDC/ethereum.png"
              alt=""
            />
            1
          </button>
        </div>

        {mintedNftState.state === "PENDING" && (
          <div className="text-xl text-white">LOADING...</div>
        )}

        {mintedNftState.state === "SUCCESS" && (
          <div className="grid md:grid-cols-3 gap-2">
            {mintedNftState.data.map(
              ({
                id,
                image,
                name,
                description,
                owner,
                resalePrice,
                approvedContract,
              }) => {
                return (
                  <div
                    key={id}
                    className="bg-white rounded p-3 border-solid border-6 border-red-500 h-auto "
                  >
                    <div>
                      <img
                        src={image}
                        className="mx-auto p-2 object-scale-down h-80"
                        alt={name}
                      />
                    </div>

                    <div className="text-xl">{name}</div>
                    <div className="">{description}</div>
                    <hr className="mb-1" />

                    <div className="text-left text-sm float-left border-2 border-solid border-transparent">
                      Owned By:
                    </div>

                    <div className="border-2 border-none mt-1.5 text-right h-9 float-right font-sans text-2xl w-auto">
                      <img
                        className="float-left"
                        src="https://img.icons8.com/ios-filled/30/187018/ethereum.png"
                        alt=""
                      />
                      {approvedContract !== contractAddress
                        ? " "
                        : resalePrice / 1e18}
                    </div>

                    <div className="text-left text-xs tracking-tighter border-2 border-solid border-transparent w-72 float-left">
                      {owner}
                    </div>

                    <div className="border-2 border-none float-right mt-1 w-72">
                      <div className="text-left text-xs border-2 border-none clear-both pl-5">
                        <label>Transfer To:</label>
                        <input
                          className="rounded-md border w-36 h-4.5 ml-1 text-center"
                          type="text"
                          placeholder="receiver address here"
                          onChange={(event) => {
                            setRecAddress(event.target.value);
                          }}
                        />
                        <button
                          className="inline-flex items-center px-2 ml-1 border border-transparent text-base font-medium rounded-md shadow-sm text-gray-500 bg-yellow-100 hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          onClick={() => {
                            handleGift(id, owner);
                          }}
                        >
                          gift
                        </button>
                      </div>
                      <div className="text-left text-xs border-2 border-none pl-5">
                        <label>Resale Price:</label>
                        <input
                          className="rounded-md border w-36
                           text-center"
                          type="number"
                          placeholder="number of ethers"
                          onChange={(event) => {
                            setSellingPrice(event.target.value);
                          }}
                        />
                        <button
                          onClick={() => {
                            handleSetPrice(id);
                          }}
                          type="button"
                          className="inline-flex items-center px-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                          set
                        </button>
                      </div>
                    </div>

                    <div className="border-none border-2 float-left">
                      <button
                        onClick={() => {
                          handleBuyFromOwner(id, resalePrice);
                        }}
                        type="button"
                        className={`${
                          approvedContract !== contractAddress
                            ? "hidden"
                            : "bg-green-800"
                        }
                        inline-flex pt-1 pb-1 px-2 mt-1 items-center border border-transparent text-base font-medium rounded-md shadow-sm text-white hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
                      >
                        BUY <br /> TOKEN
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
        <div className="m-12">
          <label>Buy Quantity:</label>
          <input
            className="rounded-md border py-2 text-center"
            type="number"
            placeholder="Quatity of tokens"
            onChange={(event) => {
              setBuyQty(event.target.value);
            }}
          />
          <button
            onClick={handlePurchaseMultiple}
            type="button"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-900 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Purchase Multiple Animals!
          </button>
        </div>
      </div>

      {/* ================================================MODAL BOXES================================================ */}

      {modalVisible && (
        <div
          className="fixed z-10 inset-0 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
            />
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              ​
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                  <svg
                    className="h-6 w-6 text-yellow-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3
                    className="text-lg leading-6 font-medium text-gray-900"
                    id="modal-title"
                  >
                    {transactionState.state === "PENDING_METAMASK" &&
                      "Connecting Metamask..."}
                    {transactionState.state === "PENDING_SIGNER" &&
                      "Waiting for Signed Transaction"}
                    {transactionState.state === "PENDING_CONFIRMAION" &&
                      "Waiting for Block Confirmation"}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {transactionState.state === "PENDING_METAMASK" &&
                        "Allow Metamask to connect to this application in the extension."}
                      {transactionState.state === "PENDING_SIGNER" &&
                        "Approve the transaction within the Metamask extension"}
                      {transactionState.state === "PENDING_CONFIRMAION" &&
                        "Transaction has been sent to the blockchain. Please wait while the transaction is being confirmed."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
