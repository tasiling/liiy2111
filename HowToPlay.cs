using UnityEngine;
using System.Collections;

public class HowToPlay : MonoBehaviour {

	// Use this for initialization
	void Start () {
		
	}
	
	// Update is called once per frame
	void Update () {
		Debug.Log ("go");
		if (Input.GetKeyDown (KeyCode.Mouse0))
			Debug.Log (1);
			this.gameObject.SetActive(false);
	
	}
		
}
