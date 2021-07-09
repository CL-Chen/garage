import React, { useState, useEffect } from "react";
// What is Ethers?
// The ethers.js library aims to be a complete and compact library for interacting with the Ethereum Blockchain and its ecosystem.
// It was originally designed for use with ethers.io and has since expanded into a more general-purpose library.

// In this script, we are only importing 4 methods from the "ethers" Library, i.e. { Contract, getDefaultProvider, providers, utils }
import { Contract, getDefaultProvider, providers, utils } from "ethers";
import { config } from "../config";
import abi from "../fixtures/abi.json";
import axios from "axios";

const formatIpfsUrl = (url) => {
  return url.replace(/ipfs:\/\//g, "https://cloudflare-ipfs.com/");
};

// const is a new keyword in ES6+. Values assigned to it cannot be changed, however, lists and dictionaries can be.
// Their variable just cannot be reassigned.
const contractAddress = "0xACE5a55fA347c43cdc4271b8931D1338211C8644";

// A Provider is an abstraction of a connection to the Ethereum network, providing a concise,
// consistent interface to standard Ethereum node functionality.

// ethers.getDefaultProvider( [ network , [ options ] ] ) ⇒ Provider
// Returns a new Provider, backed by multiple services, connected to network.
// If no network is provided, homestead (i.e. mainnet) is used.

// where [options] is set as { alchemy: config.alchemyKey }
// it is in reference to an Alchemy API Token. This API token requires a corresponding API key, i.e. alchemyKey

// What is Alchemy? --> it is an API service.

const provider = getDefaultProvider("rinkeby", { alchemy: config.alchemyKey });

// What is contract in the context of "ethers" --> A Contract is an abstraction of code that has been deployed to the blockchain.
// Creating instances of new contracts --> new ethers.Contract( address , abi , signerOrProvider )

// contract.connect( providerOrSigner ) ⇒ Contract
// Returns a new instance of the Contract, but connected to providerOrSigner.
// By passing in a Provider, this will return a downgraded Contract which only has read-only access (i.e. constant calls).
// By passing in a Signer. this will return a Contract which will act on behalf of that signer.

// What is abi? --> The Contract object uses a Contract's ABI to determine what methods are available, so the following sections
// describe the generic ways to interact with the properties added at run-time during the Contract constructor.

const contract = new Contract(contractAddress, abi, provider);

// constantly confused on where to look for the keywords. For example, export is a JS ES6 declaration
// What is the export statement? --> export live bindings to functions, objects, or primitive values from the module
// so they can be used by other programs with the import statement.

// what are arrow ("=>") functions?
// in the example below, it is used to declare the HomePage function

// useState is a Hook that lets you add React state to function components.

export const HomePage = () => {
  // useState is a Hook. We call it inside a function component to add some local state to it.
  // React will preserve this state between re-renders.
  // useState returns a pair: the current state value and a function that lets you update it.
  // In this example, "mintedNftState" is the current state and "setMintedNftState" is the updated state
  const [mintedNftState, setMintedNftState] = useState({
    state: "UNINITIALIZED",
  });
  const [purchaseState, setPurchaseState] = useState({
    state: "UNINITIALIZED",
  });
  const [transferState, setTransferState] = useState({
    state: "UNINITIALIZED",
  });

  const modalVisible =
    purchaseState.state === "PENDING_METAMASK" ||
    purchaseState.state === "PENDING_SIGNER" ||
    purchaseState.state === "PENDING_CONFIRMAION";

  const loadRobotsData = async () => {
    setMintedNftState({
      state: "PENDING",
    });
    const totalSupply = await contract.totalSupply();
    const ids = [...Array(totalSupply.toNumber()).keys()];
    const deferredData = ids.map(async (id) => {
      const ipfsUri = await contract.tokenURI(id);
      const owner = await contract.ownerOf(id);
      const formattedUri = formatIpfsUrl(ipfsUri);
      const metadata = (await axios.get(formattedUri)).data;
      const formattedImage = formatIpfsUrl(metadata.image);
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

  // The Effect Hook lets you perform side effects in function components

  // What does useEffect do?
  // By using this Hook, you tell React that your component needs to do something after render.
  // React will remember the function you passed (we'll refer to it as our “effect”),
  // and call it later after performing the DOM updates.
  useEffect(() => {
    loadRobotsData();
  }, []);
  // is [] an empty array?

  const handlePurchase = async () => {
    // What is the window component?
    // The Window component for ReactJS directs a user's attention to a particular activity in your application,
    // such as entering data or viewing information.
    const { ethereum } = window;
    if (typeof ethereum == "undefined") alert("Metamask is not detected");

    // Prompts Metamask to connect
    setPurchaseState({ state: "PENDING_METAMASK" });
    // Legacy method: ethereum.enable() (DEPRECATED)======> Use ethereum.request({ method: 'eth_requestAccounts' }) instead.
    // eth_requestAccounts method : This method is specified by EIP-1102 (opens new window).
    // It is equivalent to the deprecated ethereum.enable() provider API method.
    // Under the hood, it calls wallet_requestPermissions for the eth_accounts permission.
    // Since eth_accounts is currently the only permission, this method is all you need for now.
    await ethereum.request({ method: "eth_requestAccounts" });

    // Create new provider from Metamask
    const provider_MetaMask = new providers.Web3Provider(window.ethereum);
    // window.ethereum method allows MetaMask to inject a global API into the website
    // This API allows websites to request users' Ethereum accounts, read data from blockchains the user is connected to,
    // and suggest that the user sign messages and transactions.

    // Get the signer from Metamask
    const signer = provider_MetaMask.getSigner();

    // Create the contract instance
    const contract = new Contract(contractAddress, abi, signer);

    // Call the purchase method
    setPurchaseState({ state: "PENDING_SIGNER" });
    const receipt = await contract.purchase({ value: utils.parseEther("1") });
    setPurchaseState({ state: "PENDING_CONFIRMAION" });
    const transaction = await receipt.wait();
    setPurchaseState({ state: "SUCCESS", transaction });

    // Reload the Robots
    await loadRobotsData();
  };

  const handleTransfer = async () => {
    const { ethereum } = window;
    if (typeof ethereum == "undefined") alert("Metamask is not detected");

    setTransferState({ state: "PENDING_METAMASK" });
    await ethereum.request({ method: "eth_requestAccounts" });

    const provider_MetaMask = new providers.Web3Provider(window.ethereum);
    const signer = provider_MetaMask.getSigner();
    const contract = new Contract(contractAddress, abi, signer);

    setTransferState({ state: "PENDING_SIGNER" });
    const receipt = await contract.transferFrom(
      "0xf23b5533c3e71a456c9247cd25c722560871c8a2",
      "0xb77e12c548ed47b2bc96be1f7c1047ebd3448180",
      2
    );
    setTransferState({ state: "PENDING_CONFIRMAION" });
    const transaction = await receipt.wait();
    setTransferState({ state: "SUCCESS", transaction });

    // Reload the Robots
    await loadRobotsData();
  };

  class MyForm extends React.Component {
    render() {
      return (
        <form>
          <h1>Hello</h1>
          <p>Enter your name:</p>
          <input type="text" />
        </form>
      );
    }
  }

  return (
    <div className="min-h-screen bg-green-700">
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 ">
        <div className="text-gray-100 text-6xl pt-28 pb-20">ANIMALS</div>
        <div className="mb-12">
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
          <div className="grid grid-cols-4 gap-2">
            {mintedNftState.data.map(
              ({ id, image, name, description, owner }) => {
                return (
                  <div key={id} className="bg-white rounded p-2">
                    <div>
                      <img
                        src={image}
                        className="mx-auto p-2 object-scale-down h-60"
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
                    <button
                      onClick={handlePurchase}
                      type="button"
                      className=" items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-900 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Transfer
                    </button>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
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
                    {purchaseState.state === "PENDING_METAMASK" &&
                      "Connecting Metamask..."}
                    {purchaseState.state === "PENDING_SIGNER" &&
                      "Waiting for Signed Transaction"}
                    {purchaseState.state === "PENDING_CONFIRMAION" &&
                      "Waiting for Block Confirmation"}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {purchaseState.state === "PENDING_METAMASK" &&
                        "Allow Metamask to connect to this application in the extension."}
                      {purchaseState.state === "PENDING_SIGNER" &&
                        "Approve the purchase transaction within the Metamask extension"}
                      {purchaseState.state === "PENDING_CONFIRMAION" &&
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
