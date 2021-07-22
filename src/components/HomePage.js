import React, { useState, useEffect } from "react";
import { Contract, getDefaultProvider, providers, utils } from "ethers";
import { config } from "../config";
import abi from "../fixtures/abi.json";
import axios from "axios";

const formatIpfsUrl = (url) => {
  return url.replace(/ipfs:\/\//g, "https://cloudflare-ipfs.com/");
};
const contractAddress = "0x3B4791a1d7a7ea07ba14C165a3088220C97cDEeB";
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

    const ids = [...Array(totalSupply.toNumber()).keys()];
    const deferredData = ids.reverse().map(async (id) => {
      const ipfsUri = await contract.tokenURI(id);
      const owner = await contract.ownerOf(id);
      const formattedUri = formatIpfsUrl(ipfsUri);
      const metadata = (await axios.get(formattedUri)).data;
      const formattedImage = formatIpfsUrl(metadata.image);
      //const approvedAddress = await contract.getApproved(id);
      return {
        id,
        name: metadata.name,
        image: formattedImage,
        description: metadata.description,
        owner,
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

  // ============================================= HANDLERS ==================================================//

  const handlePurchase = async () => {
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
      return setTansactionState({ state: "UNINITIALIZED" });
    }

    await loadRobotsData();
  };

  // -------------------------------2nd Handler-------------------------------//
  const handleCollection = async () => {
    const { ethereum } = window;
    if (typeof ethereum == "undefined") alert("Metamask is not detected");
    setTansactionState({ state: "PENDING_METAMASK" });
    await ethereum.request({ method: "eth_requestAccounts" });
    const provider_MetaMask = new providers.Web3Provider(window.ethereum);
    const signer = provider_MetaMask.getSigner();
    const contract = new Contract(contractAddress, abi, signer);

    setTansactionState({ state: "PENDING_SIGNER" });
    try {
      const receipt = await contract.purchaseCollection({
        value: utils.parseEther("8"),
      });
      setTansactionState({ state: "PENDING_CONFIRMAION" });
      const transaction = await receipt.wait();
      setTansactionState({ state: "SUCCESS", transaction });
    } catch (err) {
      return setTansactionState({ state: "UNINITIALIZED" });
    }

    await loadRobotsData();
  };

  // -------------------------------3rd Handler-------------------------------//

  // -----------------track variables------------------//
  const [recAddress, setRecAddress] = useState("nullAdd");
  const [senderAddress, setSenderAddress] = useState("nullSender");
  const [tokenId, setTokenId] = useState("nullID");
  // -----------------track variables------------------//

  const handleTransfer = async (id) => {
    const { ethereum } = window;
    if (typeof ethereum == "undefined") {
      alert("Metamask is not detected");
    } else if (recAddress === "nullAdd") {
      return alert("No address detected in input box");
    }

    setTansactionState({ state: "PENDING_METAMASK" });

    await ethereum.request({ method: "eth_requestAccounts" });

    const provider_MetaMask = new providers.Web3Provider(window.ethereum);
    const signer = provider_MetaMask.getSigner();
    const contract = new Contract(contractAddress, abi, signer);

    setTansactionState({ state: "PENDING_SIGNER" });
    try {
      let receipt = await contract.transferFrom(
        senderAddress,
        recAddress,
        tokenId
      );
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
        alert("Error detected, refreshing page");
        setTansactionState({ state: "UNINITIALIZED" });
      }
    }

    await loadRobotsData();
    setRecAddress("nullAdd");
  };

  // -------------------------------4th Handler-------------------------------//
  const handleApprove = async (id) => {
    const { ethereum } = window;
    if (typeof ethereum == "undefined") {
      alert("Metamask is not detected");
    }
    setTansactionState({ state: "PENDING_METAMASK" });
    await ethereum.request({ method: "eth_requestAccounts" });
    const provider_MetaMask = new providers.Web3Provider(window.ethereum);
    const signer = provider_MetaMask.getSigner();
    const contract = new Contract(contractAddress, abi, signer);

    setTansactionState({ state: "PENDING_SIGNER" });
    try {
      const receipt = await contract.approve(
        "0x3b4791a1d7a7ea07ba14c165a3088220c97cdeeb",
        id
      );
      setTansactionState({ state: "PENDING_CONFIRMAION" });
      const transaction = await receipt.wait();
      setTansactionState({ state: "SUCCESS", transaction });
    } catch (err) {
      alert(err.code);
      console.log(err.code);
      setTansactionState({ state: "UNINITIALIZED" });
    }

    await loadRobotsData();
  };

  // -------------------------------5th Handler-------------------------------//
  const handleSale = async (id) => {
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
        value: utils.parseEther("1.1"),
      });
      setTansactionState({ state: "PENDING_CONFIRMAION" });
      const transaction = await receipt.wait();
      setTansactionState({ state: "SUCCESS", transaction });
    } catch (err) {
      if (err.code === "UNPREDICTABLE_GAS_LIMIT") {
        alert("---NOT FOR SALE!---");
        return setTansactionState({ state: "UNINITIALIZED" });
      } else if (err.code === 4001) {
        return setTansactionState({ state: "UNINITIALIZED" });
      } else {
        alert(err.code);
        console.log(err.code);
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
            onClick={handlePurchase}
            type="button"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-900 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Buy Your Own Animal
          </button>
        </div>

        {mintedNftState.state === "PENDING" && (
          <div className="text-xl text-white">LOADING...</div>
        )}

        {mintedNftState.state === "SUCCESS" && (
          <div className="grid md:grid-cols-4 gap-2">
            {mintedNftState.data.map(
              ({ id, image, name, description, owner }) => {
                return (
                  <div key={id} className="bg-white rounded p-2">
                    <div>
                      <img
                        src={image}
                        className="mx-auto p-2 object-scale-down h-80"
                        alt={name}
                      />
                    </div>

                    <div className="text-xl">{name}</div>

                    <div className="">{description}</div>
                    <hr className="my-4" />

                    <div className="text-left text-sm">Owned By:</div>
                    <div className="text-left text-xs tracking-tighter">
                      {owner}
                    </div>

                    <div>
                      {/* 0======0 PUT UP FOR SALE button 0======0 */}
                      <button
                        onClick={() => {
                          console.log(id);
                          handleApprove(id);
                        }}
                        type="button"
                        className="inline-flex items-center mr-2.5 px-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-900 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        Put up for sale
                      </button>

                      {/* 0======0 BUY THIS TOKEN(ID) button 0======0 */}
                      <button
                        onClick={() => {
                          console.log(id);
                          handleSale(id);
                        }}
                        type="button"
                        className="inline-flex items-center mr-2.5 px-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-900 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        Buy this token
                      </button>
                    </div>
                    <div className="text-left text-xs m-1 space-x-1">
                      <label>Transfer To:</label>
                      {/* 0======0 TRANSFER TO ADDRESS inputbox 0======0 */}
                      <input
                        className="rounded-md border"
                        type="text"
                        onChange={(event) => {
                          setRecAddress(event.target.value);
                          setSenderAddress(owner);
                          setTokenId(id);
                        }}
                      />
                      {/* 0======0 HANDLE TRANSFER button 0======0 */}
                      <button
                        className=" items-center px-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gray-900 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        onClick={handleTransfer}
                      >
                        Gift
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
        <div className="m-12">
          <button
            onClick={handleCollection}
            type="button"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-900 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Get the Whole Collection! (set of 8)
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
