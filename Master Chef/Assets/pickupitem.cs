using UnityEngine;
using System.Collections;

public class pickupitem : MonoBehaviour {

	public GameObject playershat1;
	public GameObject playershat2;
	public GameObject playershat3;


	// Use this for initialization
	void Start () {
		
	}
	
	// Update is called once per frame
	void Update () {
	
	}

	void OnTriggerEnter(Collider player){
		if(player.CompareTag("Player")){
			if (this.gameObject.CompareTag ("Hat1")) {
				Destroy (this.gameObject);
				playershat1.SetActive (true);
				playershat2.SetActive (false);
				playershat3.SetActive (false);
			}
			else if (this.gameObject.CompareTag ("Hat2")) {
				Destroy (this.gameObject);
				playershat1.SetActive (false);
				playershat2.SetActive (true);
				playershat3.SetActive (false);
			}
			else if (this.gameObject.CompareTag ("Hat3")) {
				Destroy (this.gameObject);
				playershat1.SetActive (false);
				playershat2.SetActive (false);
				playershat3.SetActive (true);
			}
				










		}
			
	}
}
